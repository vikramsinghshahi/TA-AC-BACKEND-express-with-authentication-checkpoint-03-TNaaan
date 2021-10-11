var express = require('express');
var passport = require('passport');
var User = require('../models/user');
var Token = require('../models/Token');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index');
});

router.get('/auth/github', passport.authenticate('github'));

router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/users/login' }),
  (req, res) => {
    res.redirect(req.session.returnTo || '/users/dashboard');
    // delete req.session.returnTo;
    // res.redirect('/users/dashboard');
  }
);

router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/users/login' }),
  (req, res) => {
    res.redirect(req.session.returnTo || '/users/dashboard');
    // delete req.session.returnTo;
    // res.redirect('/users/dashboard');
  }
);

router.get('/confirmation/:email/:token', function (req, res, next) {
  // res.send('welcome');
  console.log(req.params.token);
  Token.findOne({ token: req.params.token }, function (err, token) {
    // console.log(err, token);
    // token is not found into database i.e. token may have expired
    if (!token) {
      return res.status(400).send({
        msg: 'Your verification link may have expired. Please click on resend for verify your Email.',
      });
    } else {
      User.findOne(
        { _id: token._userId, email: req.params.email },
        function (err, user) {
          // console.log(err, user);
          // not valid user
          if (!user) {
            return res.status(401).send({
              msg: 'We were unable to find a user for this verification. Please SignUp!',
              link: req.url,
            });
          } // user is already verified
          else if (user.isVerified) {
            // console.log(res);
            return res.render('verifieduser');
            // return res.redirect('/users/login');
            // .status(200)
            // .send(`User has been already verified. Please Login `);
          } else {
            user.isVerified = true;
            // console.log(user);

            user.save(function (err) {
              if (err) {
                return res.status(500).send({ msg: err.message });
              } // account successfully verified
              else {
                return res.render('verfieduserlogin');
                // .status(200)
                // .send('Your account has been successfully verified');
              }
            });
          }
        }
      );
    }
  });
});

module.exports = router;
