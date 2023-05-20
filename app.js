
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');

const { v4:uuidv4 } = require('uuid');

const { graphqlHTTP } = require('express-graphql'); //importing graphQL to use
const graphqlSchema = require('./graphql/schema'); //Using GraphQL folder files SCHEMA
const graphqlResolver = require('./graphql/resolvers'); //Using GraphQL folder files RESOLVER
const auth = require('./middleware/auth'); //Auth file
const { clearImage } = require('./util/file'); //clears the file

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4()+ '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  //need to since need OPTIONS req, also GraphQL blocks any request that isnt a POST or GET req
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});


//We are auth, file whenever we use app
app.use(auth);


//how to deal with images using GraphQL, we have multer
app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not authenticated!')
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided!'})
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath)
  }
  return res.status(201).json({message: 'File stored', filePath: req.file.path })
})



/*
We are connecting graphQL to the app, and initializing it by linking to the GraphQL files made.
One for Schema, One for the Resolvers
*/
app.use('/graphql', graphqlHTTP({
    schema: graphqlSchema,  //link to schema page
    rootValue: graphqlResolver,  //link to resolver page
    graphiql: true,
    formatError(err) {  //format of error message, can configutre for ourselves
      //return err if want default format
      if(!err.originalError) {
        return err;
      }
      //now we can name the error fields the way we want....
      const data = err.originalError.data;
      const message = err.message || 'An error occured.';
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data}
    }
  })
)



app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    'mongodb+srv://BobAllan:b5tIpzAWNw8mFonS@cluster0.gmozk8w.mongodb.net/messages?retryWrites=true&w=majority',
    { useUnifiedTopology: true, useNewUrlParser: true}
  )
  .then(result => {
   app.listen(8080);
  })
  .catch(err => console.log(err));
