const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const res = require('express/lib/response');
const app=express()
require('dotenv').config()
const port=process.env.PORT||5000

app.use(express.json())
app.use(cors())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wtkrj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



const varyfyJTW=(req,res,next)=>{
const authoHeader=req.headers.authorization;
if(!authoHeader){
    return res.status(401).send({massage:"you are UnAuthorized access"})

}
const token= authoHeader.split(' ')[1]
jwt.verify(token,process.env.ACCES_TOKEN,function(err,decoded){
    if(err){
        return  res.status(401).send({message:"Forbidden access"})
    }
    req.decoded=decoded;
    next()
})
}

const run=async()=>{
        try{
            await client.connect();
            const dataCollection=client.db('doctor_protal').collection('services')
            const bookingCollection=client.db('doctor_protal').collection('booking')
            const userCollection=client.db('doctor_protal').collection('user')

            app.get('/services',async(req,res)=>{
                const quary={}
                const cursor=  dataCollection.find(quary)
                const result=await cursor.toArray()
                res.send(result)
            })
            app.get('/user', varyfyJTW, async(req,res)=>{
                const result=await userCollection.find().toArray()
                res.send(result)
            })




            app.get('/booking',varyfyJTW,async(req,res)=>{
                const patient=req.query.patient;
            

                const decodedEmail=req.decoded.email
                if(patient===decodedEmail){
                    const quary={patient:patient};
                    const cursor=bookingCollection.find(quary)
                    const result=await cursor.toArray()
                    res.send(result)
                }
                else{
                    return res.status(403).send({massage:"Forbidden access"})
                }
              
            })
            app.put('/user/admin/:email' , varyfyJTW,async(req,res)=>{
                const email =req.params.email;
                const requstEmail=req.decoded.email;
                const reaustAuthor= await userCollection.findOne({email:requstEmail})
                if(reaustAuthor.role==="admin"){
                    const filter={email:email}
                    const updateData={
                        $set:{role:"admin"},
                    }
                    const result=await userCollection.updateOne(filter,updateData);
                    res.send(result)
                }
                else{
                    res.status(403).send({message:"forbidden"})
                }
               
            })
            app.put('/user/:email',async(req,res)=>{
                const email =req.params.email;
                const user= req.body;
                const filter={email:email}
                const options={upsert:true}
                const updateData={
                    $set:user,
                }
                const result=await userCollection.updateOne(filter,updateData,options);
                const token=jwt.sign({email:email},process.env.ACCES_TOKEN,{expiresIn:"1h"})
                res.send({result,token})
            })

            

            app.get('/available',async(req,res)=>{
                const date=req.query.date
                const services= await dataCollection.find().toArray()

                const query={date:date}
                const bookings=await bookingCollection.find(query).toArray()

                services.forEach(service=>{
                    const serviceBooking=bookings.filter(b=>b.treatment=== service.name)
                  const booked=serviceBooking.map(s=>s.slot)
                  const available=service.slots.filter(s=>!booked.includes(s))
                  service.slots=available
                })

                res.send(services)


            })

       


            app.post('/booking', async(req,res)=>{
                const booking=req.body;
                const query={treatment:booking.treatment,date:booking.date,patient:booking.patient}

                const exists= await bookingCollection.findOne(query)
                if(exists){
                    return res.send({success:false,booking:exists})
                }
                const result= await bookingCollection.insertOne(booking);

                res.send({success:true,result})
            })



        }
        finally{
            
        }
}
run().catch(console.dir)









app.get('/',(req,res)=>{
    res.send('doctor portal')
})
app.listen(port)