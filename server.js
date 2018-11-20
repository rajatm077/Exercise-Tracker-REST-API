require('dotenv').config();

const moment = require('moment');
const express = require('express');
const app = express();
const User = require('./models/user').User;
const { Exercise, validate } = require('./models/exercise');

const cors = require('cors');

const mongoose = require('mongoose');
const mConnectionOpts = {
  useMongoClient: true
};

mongoose.connect('mongodb://localhost/fcc_exercisetracker', mConnectionOpts)
  .then(() => console.log('Connected to mlab'))
  .catch((err) => console.log(`Failed to connect to mlab: ${err.message}`));

app.use(cors());
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', async (req, res) => {
  try {
    const username = req.body.username;
    let user = await User.findOne({ username: username });
  
    if (user) res.send('username already taken');
    
    user = new User({ username });
    user = await user.save();
    res.send(user);

  } catch(err) {
    console.log('Error in new user api: ', err.message);
  }    
});

app.post('/api/exercise/add', async (req, res) => {
  try {
    let userId = req.body.userId;    
    let isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid) res.send('unknown _id');
    let user = await User.findById(userId);
    if (!user) res.send('unknown _id');
    
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);
  
    let date = req.body.date;
    if (date == '') {
      date = moment(new Date());
      console.log(date);      
    } else {
      let isValidDate = moment(date, "YYYY-MM-DD").isValid();
      if (!isValidDate) date = moment(new Date());
    }

    let exercise = new Exercise({
      userId, 
      description: req.body.description,
      duration: req.body.duration,
      date
    });

    exercise = await exercise.save();
    res.send({
      "username": user.username,
      "description": exercise.description,
      "duration": exercise.duration,
      "_id": userId,
      "date": moment(exercise.date).format("ddd MMM DD YYYY") 
    });

  } catch (err) {
    console.log(`Error at exercise/add api: ${err.message}`);
  }  
});

app.get('/api/exercise/log', async (req, res) => {
  try {
    let userId = req.query.userId;
    if (!userId) { res.status(400).send('unknown userId'); return; }

    let isValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isValid) { res.status(400).send('unknown userId'); return; }
    let user = await User.findById(userId);
    if (!user) { res.status(400).send('unknown userId'); return; }
    
    let opfrom = req.query.from || new Date(-8640000000000000);
    let opto = req.query.to || new Date();
    let oplimit = parseInt(req.query.limit) || 0;

    let exercises = await Exercise.find({ 
      userId: userId, 
      date: { $gte: opfrom, $lte: opto }
    }).limit(oplimit);

    let log = {
      "id": userId,
      "username": user.username,
      "from": (req.query.from) ? req.query.from: undefined,
      "to": (req.query.to) ? req.query.to: undefined,
      "log": exercises
    };

    res.json(log);
  
  } catch(err) {
    console.log(`Error at get logs api: ${err.message}`);
  }
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
