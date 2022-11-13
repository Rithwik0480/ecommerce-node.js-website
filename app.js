const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser=require('body-parser')
//env
const dotenv=require('dotenv')
//session npm install
const session=require('express-session')
//HBS install
const hbs = require('express-handlebars')
//mongongo connection
const db=require('./config/connection')
const adminRouter = require('./routes/admin')
const userRouter = require('./routes/user')
const app = express();
dotenv.config();

app.use((req,res,next)=>{
  res.set('Cache-Control','no-cache, private,no-store,must-revalidate,max-stale=0,pre-check=0')
  next()
})
//index increment 
let Handlebars = require('handlebars');
Handlebars.registerHelper("inc", function(value, options)
{
    return parseInt(value) + 1;
});
//to execute IF conditions in hbs
Handlebars.registerHelper('eq', function( a, b ){
	var next =  arguments[arguments.length-1];
	return (a === b) ? next.fn(this) : next.inverse(this);
});



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
//default layout&partials setting
app.engine('hbs',hbs.engine({extname:'hbs', defaultLayout:'layout',layoutsDir:__dirname+'/views/layout/', partialsDir:__dirname+'/views/partials/'}))
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//calling session
app.use(
  session({
    secret: "My secret key to use",
    resave: false,
    saveUninitialized: false,
  })
); 

//calling mongodb connect
db.connect((err)=>{
  if(err)
  console.log('connection error'+err);
  else
  console.log('data base connected successfully');
})

app.use('/', adminRouter);
app.use('/user', userRouter);










// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
