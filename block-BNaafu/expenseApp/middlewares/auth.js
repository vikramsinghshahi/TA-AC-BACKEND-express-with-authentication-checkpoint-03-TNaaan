const { session } = require('passport');
var User = require('../models/user');

module.exports = {
  loggedInUser: (req, res, next) => {
    if (req.session && req.session.userId) {
      next();
    } else if (req.session && req.session.passport) {
      next();
    } else {
      req.flash('error', 'You must be logged-In to perform this action');
      //   console.log(req.session);
      req.session.returnTo = req.originalUrl;
      //   console.log(req.session);
      res.redirect('/users/login');
    }
  },

  userInfo: (req, res, next) => {
    var userId = req.session && req.session.userId;

    if (req.session.userId) {
      User.findById(userId, 'name email profilepic', (err, user) => {
        if (err) return next(err);
        req.user = user;
        res.locals.user = user;
        next();
      });
    } else if (req.session.passport) {
      let userId = req.session && req.session.passport.user;
      User.findById(userId, 'name email profilePic', (err, user) => {
        if (err) return next(err);
        req.user = user;
        res.locals.user = user;
        next();
      });
    } else {
      req.user = null;
      res.locals.user = null;
      next();
    }
  },
};
