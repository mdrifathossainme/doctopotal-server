const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app=express()
require('dotenv').config()
const port=process.env.PORT||5000

app.use(express.json())
app.use(cors())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wtkrj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run=async()=>{
        try{
            await client.connect();
            const dataCollection=client.db('doctor_protal').collection('services')
            const bookingCollection=client.db('doctor_protal').collection('booking')

            app.get('/services',async(req,res)=>{
                const quary={}
                const cursor=  dataCollection.find(quary)
                const result=await cursor.toArray()
                res.send(result)
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