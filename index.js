const express = require('express')
const { MongoClient } = require('mongodb');
const fileUpload = require('express-fileupload');
const ObjectId = require('mongodb').ObjectId;
var cors = require('cors')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const app = express()
const port = process.env.PORT || 5000

/** 
 * middleware
*/
app.use(cors())
app.use(express.json())
app.use(fileUpload());

/**  
* mongodb credentials
*/
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krune.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  try {
    await client.connect();
    const database = client.db("ryans_clone");
    const productsCollection = database.collection("products");
    const usersCollection = database.collection("users");
    const categoriesCollection = database.collection("categories");
    const ordersCollection = database.collection("orders");

    /** 
    * Get api
    */
    const get_api = (uri, collection) => {
      app.get(`${uri}`, async (req, res) => {
        let query = {}
        const cursor = collection.find(query);
        const result = await cursor.toArray()
        res.json(result)

      })
    }
    /** 
    * Get api query
    */
    const get_api_query = (uri, collection) => {
      app.get(`${uri}`, async (req, res) => {
        const email = req?.query?.email
        let query = { email, email }
        const result = await collection.findOne(query);
        res.json({ role: result?.role })
      })
    }
    /** 
    * Get api single
    */
    const get_api_single = (uri, collection) => {
      app.get(`${uri}`, async (req, res) => {
        const documentId = req?.params?.id
        const query = { _id: ObjectId(documentId) }
        const result = await collection.findOne(query);
        res.json(result)
      })
    }

    /**
    * Post api
    */
    const post_api = (uri, collection) => {
      app.post(`${uri}`, async (req, res) => {
        let document = req.body
        if (req?.files?.image) {
          const imageData = req.files.image.data
          const encoded = imageData.toString('base64');
          const image = Buffer.from(encoded, 'base64')
          document = {
            ...document, image
          }
        }
        const result = await collection.insertOne(document)

        res.json(result)
      })
    }
    /* *
    * Delete API
    */
    const delete_api = (uri, collection) => {
      app.delete(`${uri}`, async (req, res) => {
        const documentId = req?.params?.id
        const query = { _id: ObjectId(documentId) }
        const result = await collection.deleteOne(query);
        res.json(result)
      })
    }
    /* *
    * Put api products
    */
    const put_api = (uri, collection) => {
      app.put(`${uri}`, async (req, res) => {
        console.log('i got hit')
        const documentId = req?.params?.id
        let document = req.body
        if (req?.files?.image) {
          const imageData = req.files.image.data
          const encoded = imageData.toString('base64');
          const image = Buffer.from(encoded, 'base64')
          document = {
            ...document, image
          }
        }
        const filter = { _id: ObjectId(documentId) }
        const updateDoc = {
          $set: {
            title: document.title,
            image: document.image,
            price: document.price,
            short_des: document.short_des
          },
        };
        const result = await collection.updateOne(filter, updateDoc)
        res.json(result)
      })
    }
    /* *
      * Put api user
      */
    const put_api_user = (uri, collection) => {
      app.put(`${uri}`, async (req, res) => {
        const requester = req?.query?.requester
        console.log(requester)
        let newUser = req.body
        const query = { email: newUser.email }
        const user = await collection.findOne(query)
        if (user) {
          const updateDoc = {
            $set: {
              role: newUser.role,
            },
          };
          const result = await collection.updateOne(query, updateDoc)
          res.json(result)
        }
      })
    }
    /* *
    * post api users
    */
    const post_api_users = (uri, collection) => {
      app.post(`${uri}`, async (req, res) => {
        let newUser = req.body
        const query = { email: newUser.email }
        const user = await collection.findOne(query)
        if (!user) {
          newUser = { ...newUser, role: "user" }
          const result = await collection.insertOne(newUser)
          res.json(result)
        } else {
          res.json({ info: 'user already exist' })
        }
      })
    }
    // products api
    get_api('/products', productsCollection)
    get_api_single('/products/:id', productsCollection)
    post_api('/products', productsCollection) //add product
    put_api('/products/:id', productsCollection) //edit product
    delete_api('/products/:id', productsCollection) //delete product


    get_api('/users', usersCollection) //get all the users
    post_api_users('/users', usersCollection) //add user to the database
    get_api_query('/users/role', usersCollection) //determining the user role
    put_api_user('/users', usersCollection) // user role update
    delete_api('/users/:id', usersCollection) //delete product

    // Categories api
    post_api('/categories', categoriesCollection)
    get_api('/categories', categoriesCollection)
    get_api_single('/categories/:id', categoriesCollection)
    delete_api('/categories/:id', categoriesCollection)
    app.put('/categories/:id', async (req, res) => {
      const cat_id = req.params.id
      const cat_name = req.body.cat_name
      const filter = { _id: ObjectId(cat_id) }
      const updateDoc = {
        $set: {
          cat_name: cat_name
        },
      };
      const result = await categoriesCollection.updateOne(filter, updateDoc);
      res.json(result)

    })
    app.get('/productsByCategory', async (req, res) => {
      const cat = req.query.q
      const query = { category: cat }
      const cursor = productsCollection.find(query);
      const result = await cursor.toArray()
      res.json(result)
    })

    // orders api 

    //user orders
    app.get('/usersOrders/:email', async (req, res) => {
      const email = req.params.email;
      const query = { user: email };
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray()
      res.json(orders)
    })
    app.put('/orders/:id', async (req, res) => {
      const orderId = req.params.id;
      const orderStatus = req.body;
      const filter = { _id: ObjectId(orderId) }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: orderStatus.status
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc, options);
      res.json(result)

    })
    get_api('/orders', ordersCollection)
    delete_api('/orders/:id', ordersCollection) //cancel order
    /* *
    *Stripe payment
    */
    app.post('/create-payment-intent', async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        payment_method_types: ['card']
      });
      res.json({ clientSecret: paymentIntent.client_secret })

    })
    //saving the order data to order table in the database
    post_api('/ordersWithPayment', ordersCollection)

  } finally {
    // await client.close();
  }
}
run().catch(console.dir);



/**
* Test Connection
*/
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})