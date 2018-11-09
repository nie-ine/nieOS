const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get('/:id', (req, res, next) => {
  User.findById(req.params.id)
    .then((user) => {

      // Tests if ID was found in the mongoDB
      if (user.length === 0) {
        return res.status(404).json({
          message: 'User with such an ID was not found!'
        })
      }

      // Response if user was found
      res.status(200).json({
        message: 'User was found!',
        user: {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          newsletter: user.newsletter
        }
      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      })
  });
});

router.put('/:id', checkAuth, (req, res, next) => {
  let messages = [];

  // Tests if email address is invalid
  const emailPattern = /^\S+[@]\S+[.]\S+$/;
  if (!emailPattern.test(req.body.email)) {
    messages.push('Your email address is invalid!');
  }

  // Tests if first name is undefined, null or is empty string
  if (!Boolean(req.body.firstName)) {
    messages.push('Your first name is invalid!');
  }

  // Tests if last name is undefined, null or is empty string
  if (!Boolean(req.body.lastName)) {
    messages.push('Your last name is invalid');
  }

  // Attaches error messages to the response
  if (messages.length > 0) {
    return res.status(400).json({
      messages: messages
    });
  }

  // Searches after other users with same email addresses
  User.find({_id: {'$ne': req.body.userId}, email: req.body.email})
    .then((result) => {

      // Checks if other users with same email address were found
      if (result.length > 0) {
        return res.status(409).json({
          message: 'This email address is already taken!'
        });
      }

      // Updates user data
      User.findOneAndUpdate({_id: req.body.userId},
        {
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          newsletter: req.body.newsletter
        })
        .then((result) => {
          // Creates new token
          const token = jwt.sign(
            {
              email: req.body.email,
              userId: req.body.userId
            },
            'secret_that_should_be_longer',
            {
              expiresIn: '1h'
            });
          res.status(200).json({
            token: token,
            expiresIn: '3600',
            firstName: req.body.firstName,
            userId: req.body.userId
          });
        })
        .catch(err => {
          res.status(500).json({
            error: err
          })
        });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      })
    });
});

router.put('/:id/pwd', checkAuth, (req, res, next) => {
  let messages = [];

  // Tests if old password input is undefined, null or is empty string
  if (!Boolean(req.body.oldPwd)) {
    messages.push('Your old password input is invalid!');
  }

  // Tests if new password input is undefined, null or is empty string
  if (!Boolean(req.body.newPwd)) {
    messages.push('Your new password input is invalid!');
  }

  // Attaches error messages to the response
  if (messages.length > 0) {
    return res.status(400).json({
      messages: messages
    });
  }

  // Tests if new password has minimum length
  const newPwdPattern = /^.{4,}$/;
  if (!newPwdPattern.test(req.body.newPwd)) {
    return res.status(400).json({
      message: 'Your new password should contain minimum 4 characters!'
    });
  }

  User.findById(req.body.userId)
    .then((user) => {

      const p1 = bcrypt.compare(req.body.newPwd, user.password);
      const p2 = bcrypt.compare(req.body.oldPwd, user.password);

      Promise.all([p1, p2]).then((result) => {
        // Tests if new password is the same as the old one
        if (!result[1]) {
          return res.status(400).json({
            message: "Your old password input is wrong!"
          })
          // Tests if the password input is wrong
        } else if (result[0]) {
            return res.status(420).json({
              message: "Your new password is the same as the old one!"
          })
          // In case new password is different and the password input is the same
        } else {
          // Create hash of new pwd
          bcrypt.hash(req.body.newPwd, 10)
            .then((hash => {
              // Find User in database and update pwd
              User.findOneAndUpdate({_id: req.body.userId},
                {
                  password: hash
                })
                .then(result => {
                  // Create response
                  res.status(201).json({
                    message: 'Pwd updated',
                  });
                });
            }))
            .catch(err => {
              res.status(500).json({
                error: err
              })
            });
        }
      })
    })
    .catch(err => {
      console.log(err);
      return res.status(401).json({
        message: 'Auth failed'
      });
    });

  // Test if new password has white spaces
  // const nonWhitespace = /^\S*$/;
  // if (!nonWhitespace.test(req.body.newPwd)) {
  //   console.log("point a");
  //   return res.status(401).json({
  //     message: 'Your new password contains white spaces!'
  //   })
  // }

});

router.post('/signup', (req, res, next) => {
  // Tests if email address is invalid
  const emailPattern = /^\S+[@]\S+[.]\S+$/;
  if (!emailPattern.test(req.body.email)) {
    return res.status(400).json({
      message: 'Your email address is invalid!'
    });
  }

  // Searches after users that have the same email addresses
  User.find({email: req.body.email})
    .then((result) => {

      // Checks if other users with same email address were found
      if (result.length > 0) {
        return res.status(409).json({
          message: 'Email address already exists!'
        });
      }

      // Creates new user with hashed password
      bcrypt.hash(req.body.password, 10)
        .then( hashPwd => {
          const user = new User({
            email: req.body.email,
            password: hashPwd,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            newsletter: true
          });
          user.save()
            .then(result => {
              res.status(201).json({
                message: 'User was created',
                result: result
              });
            })
            .catch(err => {
              res.status(500).json({
                error: err
              })
            });
        });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      })
    });
});

router.post('/login', (req, res, next) => {
  let fetchedUser;
  User.findOne({ email: req.body.email })
    .then( user => {
      if (!user) {
        return res.status(401).json({
          message: 'Auth failed'
        })
      }
      fetchedUser = user;
      return bcrypt.compare(req.body.password, user.password);
    })
    .then(result => {
      if(!result) {
        return res.status(401).json({
          message: 'Auth failed'
        });
      }
      const token = jwt.sign(
        {
          email: fetchedUser.email,
          userId: fetchedUser._id
        },
        'secret_that_should_be_longer',
        {
          expiresIn: '1h'
        });
      res.status(200).json({
        token: token,
        expiresIn: '3600',
        firstName: fetchedUser.firstName,
        userId: fetchedUser._id
      });
    })
    .catch(err => {
      console.log(err);
      return res.status(401).json({
        message: 'Auth failed'
      });
    });
});

module.exports = router;
