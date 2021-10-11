var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt');
var Token = require('../models/Token');
var crypto = require('crypto');

// console.log(crypto.randomBytes(16).toString('hex'));

var User = require('../models/user');

var auth = require('../middlewares/auth');

function randomNumber() {
  let str = '0123456789',
    str2 = '';
  for (let i = 0; i <= 5; i++) {
    str2 += str[Math.floor(Math.random() * 9)];
  }
  return str2;
}

/* GET users listing. */
router.get('/', (req, res, next) => {
  console.log(req.user);
  // res.render('users');
});

router.get('/register', (req, res, next) => {
  var error = req.flash('error')[0];
  res.render('registerForm', { error });
});

router.post('/register', (req, res, next) => {
  User.create(req.body, (err, user) => {
    // console.log(users);
    if (err) {
      if (err.name === 'ValidationError') {
        req.flash('error', err.message);
        return res.redirect('/users/register');
      }

      req.flash('error', 'This email is taken');
      return res.redirect('/users/register');
      // return res.json({ err });
      // return next(err);
    }

    // generate token and save

    var token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString('hex'),
    });

    // console.log(token);
    //saving token into the database
    token.save(function (err) {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }

      //send email through node mailer
      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'testexpressmail0@gmail.com',
          pass: 'vikram1996',
        },
      });
      var mailOptions = {
        from: 'testexpressmail0@gmail.com',
        to: user.email,
        subject: 'Account Verification Link',
        text:
          'Hello ' +
          req.body.name +
          ',\n\n' +
          'Please verify your account by clicking the link: \nhttp://' +
          req.headers.host +
          '/confirmation/' +
          user.email +
          '/' +
          token.token +
          '\n\nThank You!\n',
      };

      transporter.sendMail(mailOptions, function (err, data) {
        if (err) {
          return res.status(500).send({
            msg: 'Technical Issue!, Please click on resend to verify your Email.',
          });
        } else {
          req.flash(
            'success',
            'A verification email has been sent to ' +
              user.email +
              '. It will expire after one day. If you not get verification Email click on resend token.'
          );
          res.redirect('/users/login');
        }
      });
    });

    // res.redirect('/users/login');
  });
});

router.get('/login', (req, res, next) => {
  var error = req.flash('error')[0];
  var success = req.flash('success')[0];
  let info = req.flash('info')[0];
  // console.log(success);
  res.render('login.ejs', { error, success, info });
});

// router.post('/login', (req, res, next) => {

// });
router.post('/login', (req, res, next) => {
  var { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email/Password required');
    return res.redirect('/users/login');
  }
  User.findOne({ email }, (err, user) => {
    if (err) return next(err);
    // no user
    if (!user) {
      req.flash('error', 'This email is not registered');
      return res.redirect('/users/login');
    }
    // compare password
    user.verifyPassword(password, (err, result) => {
      if (err) return next(err);
      if (!result) {
        req.flash('error', 'Invalid Password');
        return res.redirect('/users/login');
      }
      // persist login user info
      req.session.userId = user.id;
      // res.redirect(req.session.returnTo || '/users/dashboard');
      console.log(req.session);
      // delete req.session.returnTo;
      res.redirect('/users/dashboard');
    });
  });
});

//render forgot password page

router.get('/login/forgotpassword', (req, res, next) => {
  let error = req.flash('error')[0];
  // let info = req.flash('info')[0];
  res.render('forgotPassword', { error });
});

let code = randomNumber();

// process forgetpassword request
router.post('/login/forgotpassword', (req, res, next) => {
  let { email } = req.body;
  req.body.random = code;
  console.log(req.body, req.body.random);

  User.findOneAndUpdate({ email }, req.body, (err, user) => {
    if (err) return next(err);
    console.log(user);
    if (!user) {
      req.flash(
        'error',
        'The Email entered is not Registered, Please register!'
      );
      return res.redirect('/users/login/forgotpassword');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'testexpressmail0@gmail.com',
        pass: 'vikram1996',
      },
    });

    const mailOptions = {
      from: 'testexpressmail0@gmail.com',
      to: email,
      subject: 'Verification Email',
      html: `<h1>${req.body.random}</h1>
                <h2>Please Copy above 6 digit number and visit this link http://localhost:4000/users/login/resetpassword/verify </h2>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return next(err);
      req.flash('info', 'A verification code has been sent to your email');
      req.session.email = email;
      res.redirect('/users/login/resetpassword/verify');
    });
  });
});

//render reset password verification code page
router.get('/login/resetpassword/verify', (req, res, next) => {
  let error = req.flash('error')[0];
  let info = req.flash('info')[0];
  res.render('resetPasswordVerificationCode', { error, info });
});

//process verification code
router.post('/login/resetpassword/verify', (req, res, next) => {
  console.log(req.body, 'verify');
  let email = req.session.email;
  let { passcode } = req.body;
  User.findOne({ email }, (err, user) => {
    console.log(passcode, code, 'codes');
    if (err) return next(err);

    if (passcode == code) {
      return res.redirect('/users/login/resetpassword');
    } else {
      req.flash('error', 'Invalid verification code');
      res.redirect('/users/login/resetpassword/verify');
    }
  });
});

//render reset password page
router.get('/login/resetpassword', (req, res, next) => {
  let error = req.flash('error')[0];
  res.render('resetPassword', { error });
});

//reset password
router.post('/login/resetpassword', (req, res, next) => {
  console.log(req.body, 'reset');
  let { newPasswd1, newPasswd2 } = req.body;
  let email = req.session.email;
  if (newPasswd1 === newPasswd2 && newPasswd1 && newPasswd2) {
    User.findOne({ email }, (err, user) => {
      if (err) return next(user);
      bcrypt.hash(newPasswd1, 10, (err, hashed) => {
        console.log(hashed, 'hashed');
        if (err) return next(err);
        req.body.password = hashed;
        User.findOneAndUpdate({ email }, req.body, (err, user) => {
          if (err) return next(err);
          req.flash('info', 'Password has been changed Successfully');
          return res.redirect('/users/login');
        });
      });
    });
  } else {
    req.flash('error', 'Password does not match');
    res.redirect('/users/login/resetpassword');
  }
});

router.use(auth.loggedInUser);

router.get('/dashboard', (req, res, next) => {
  // let userId = req.session.userId;
  let userId = req.session.userId || req.session.passport.user;
  User.findOne({ _id: userId }, (err, user) => {
    if (err) return next(err);
    res.render('dashboard', { user: user });
  });
});

router.get('/logout', (req, res, next) => {
  // console.log(req.session);
  // req.session.destroy();
  // res.clearCookie('connect.sid');
  // res.redirect('/users/login');
  // console.log(req.session);
  if (!req.session) {
    req.flash('error', 'You must login first');
    res.redirect('/users/login');
  } else {
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.redirect('/users/login');
  }
});

module.exports = router;
