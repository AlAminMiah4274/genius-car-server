const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ubvegtf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// to verify jwt token 
function verifyJWT(req, res, next) {
    const authHeader = req.header.authorization;
    if (!authHeader) {
        res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(401).send({ message: 'unauthorized access' });
        };
        req.decoded = decoded;
        next();
    });
};

async function run() {
    try {
        const servicesCollection = client.db('geniusCar').collection('services');
        const ordersCollection = client.db('geniusCar').collection('oerders');

        // creating jwt token 
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
            res.send({ token });
        });

        // services api:
        app.get('/services', async (req, res) => {
            const query = {} // to find all data or unspecific data
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const service = await servicesCollection.findOne(query);
            res.send(service);
        });

        // order api: 

        app.get('/orders', verifyJWT, async (req, res) => {

            let query = {};

            // to find specific orders done by a specific email:
            if (req.query.email) {
                query = {
                    email: req.query.email
                };
            };
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });

        // order status update: 
        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const status = req.body.status;
            const updateDoc = {
                $set: {
                    status: status
                }
            };
            const result = await ordersCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Hello from Genius Car server.');
});

app.listen(port, (req, res) => {
    console.log(`Genius Car server is runnig on port: ${port}`);
});