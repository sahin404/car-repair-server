const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

//middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.aqwgs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//Custom Middlewaree
const verifyToken = (req,res,next)=>{
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message:'Anauthorized Access'});
  }
  else{
    jwt.verify(token, process.env.SECRET, (err,decoded)=>{
      if(err){
        return res.status(401).send({message:'Anauthorized Access'});
      }
      req.user = decoded;
      next();
    })
    
  }
  
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    
    const serviceCollection = client.db('carDoctorAgain').collection('services');
    const bookingCollection = client.db('carDoctorAgain').collection('bookings');


    // atuh related API
    app.post('/jwt', async(req,res)=>{
      const userInfo = req.body;
      const token = jwt.sign(userInfo, process.env.SECRET, {expiresIn:'1h'});
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:false,
        sameSite:'Strict'
      })
      .send({success:true}); 
    })

    app.post('/logout', async(req,res)=>{
      res
      .clearCookie('token', {maxAge:0})
      .send({success:true});
    } )


    // Services Related API
    app.get('/services', async(req,res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/services/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const options = {
            projection:{title:1, price:1, img:1}
        }
        const result = await serviceCollection.findOne(query, options);
        res.send(result);
    })


    app.post('/bookings', async(req,res)=>{
        const body = req.body;
        
        // console.log(body);
        const result = await bookingCollection.insertOne(body);
        res.send(result);
    })

    app.get('/bookings', verifyToken, async(req,res)=>{
      
      if(req.query?.email!==req.user.email){
        return res.status(403).send({message:'Forbidden Access.'});
      }
      let query = {};
      if(req.query?.email){
        query={email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })




    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);







app.get('/', (req,res)=>{
    res.send('doctor is running..');
})

app.listen(port, ()=>{
    console.log(`car doctor is running at ${port}`);
})

