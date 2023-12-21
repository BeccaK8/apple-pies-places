/////////////////////////////
//// Import Dependencies ////
/////////////////////////////
const express = require('express')
const axios = require('axios')
const allPlacesUrl = process.env.COUNTRY_API_URL
const nameSearchBaseUrl = process.env.C_BY_NAME_BASE_URL
const Place = require('../models/place')

///////////////////////
//// Create Router ////
///////////////////////
const router = express.Router()

//////////////////////////////
//// Routes + Controllers ////
//////////////////////////////
// GET -> /places/all
// gives us all countries in the api for an index
router.get('/all', (req, res) => {
    const { username, loggedIn, userId } = req.session
    // we have to make our api call
    axios(allPlacesUrl)
        // if we get data, render an index page
        .then(apiRes => {
            console.log('this came back from the api: \n', apiRes.data[0])
            // apiRes.data is an array of country objects
            // res.send(apiRes.data)
            res.render('places/index', { places: apiRes.data, username, userId, loggedIn})
        })
        // if something goes wrong, display an error page
        .catch(err => {
            console.log('error')
            res.redirect(`/error?error=${err}`)
        })
})

// POST -> /places/add
// gets data from the all countries show pages and adds to the users list
router.post('/add', (req, res) => {
    const { username, loggedIn, userId } = req.session

    const thePlace = req.body
    thePlace.owner = userId
    // default value for a checked checkbox is 'on'
    // this line of code converts that two times
    // which results in a boolean value
    thePlace.visited = !!thePlace.visited
    thePlace.wishlist = !!thePlace.wishlist
    thePlace.favorite = !!thePlace.favorite

    Place.create(thePlace)
        .then(newPlace => {
            // res.send(newPlace)
            res.redirect(`/places/mine`)
        })
        .catch(err => {
            console.log('error')
            res.redirect(`/error?error=${err}`)
        })
})

// GET -> /places/mine
// displays all the user's saved places
router.get('/mine', (req, res) => {
    const { username, loggedIn, userId } = req.session
    // query the db for all places belonging to the logged in user
    Place.find({ owner: userId })
        // display them in a list format
        .then(userPlaces => {
            // res.send(userPlaces)
            res.render('places/mine', { places: userPlaces, username, loggedIn, userId })
        })
        // or display any errors
        .catch(err => {
            console.log('error')
            res.redirect(`/error?error=${err}`)
        })
})

// GET -> /mine/:id
// Will display a single instance of a user's saved places
router.get('/mine/:id', (req, res) => {
    const { username, loggedIn, userId } = req.session
    const myPlaceId = req.params.id;
    // find a specific place using the id
    Place.findById(myPlaceId)
        // display a user-specific show pages
        .then(thePlace => {
            res.render('places/myShow', { place: thePlace, username, loggedIn, userId })
        })
        // send an error page if something goes wrong
        .catch(err => {
            console.log('error')
            res.redirect(`/error?error=${err}`)
        })
})

// UPDATE -> /places/update/:id
router.put('/update/:id', (req, res) => {
    const { username, loggedIn, userId } = req.session
    // target specific place
    const placeId = req.params.id;
    const theUpdatedPlace = req.body;

    // sometimes mean hackers try to steal stuff
    // remove the ownership from req.body (even if it is not sent)
    // the reassign using the session info
    delete theUpdatedPlace.owner;
    theUpdatedPlace.owner = userId;

    theUpdatedPlace.visited = !!theUpdatedPlace.visited
    theUpdatedPlace.wishlist = !!theUpdatedPlace.wishlist
    theUpdatedPlace.favorite = !!theUpdatedPlace.favorite
    console.log('this is the req body: ', theUpdatedPlace);

    // find the place
    Place.findById(placeId)
    // check for authorization (i.e., owner)
    // if they are the owenr, allow update and refresh the page
        .then(foundPlace => {
            // determine if logged in user is authorized to delete this (aka the owner)
            // use double equal as the type may be different (ObjectId vs String)
            if (foundPlace.owner == userId) {
                // now we can update
                // this is document method so lower case place
                return foundPlace.updateOne(theUpdatedPlace);
            } else {
                // not the owner so redirect to error page
                res.redirect(`/error?error=You%20Not%20Allowed%20to%20Update%20this%20Place`);
            }
        })
        // redirect to another page
        .then(returnedPlace => {
            res.redirect(`/places/mine/${placeId}`);
        })
        // if not, send error
        // handle any errors that may come up
        .catch(err => {
            console.log('error')
            res.redirect(`/error?error=${err}`)
        })
});

// DELETE -> /places/delete/:id
// Remove places from a user's list
// only available to the authorized user
router.delete('/delete/:id', (req, res) => {
    const { username, loggedIn, userId } = req.session
    // target specific place
    const placeId = req.params.id;
    // find it in the database
    Place.findById(placeId)
        .then(place => {
            // determine if logged in user is authorized to delete this (aka the owner)
            // use double equal as the type may be different (ObjectId vs String)
            if (place.owner == userId) {
                // now we can delete
                // this is document method so lower case place
                return place.deleteOne();
            } else {
                // not the owner so redirect to error page
                res.redirect(`/error?error=You%20Not%20Allowed%20to%20Delete%20this%20Place`);
            }
        })
        // delete it    
        .then(deletedPlace => {
            console.log('this was returned from deleteOne: \n', deletedPlace);
            // redirect to another page
            res.redirect('/places/mine');
        })
        // handle any errors that may come up
        .catch(err => {
            console.log('error')
            res.redirect(`/error?error=${err}`)
        })
});

// GET -> /places/:name
// give us a specific country's details after searching with the name
// goes under all more specific routes
router.get('/:name', (req, res) => {
    const { username, loggedIn, userId } = req.session
    const placeName = req.params.name
    // could use destructuring, but no need with one item
    // const { placeName } = req.params
    // make our api call
    axios(`${nameSearchBaseUrl}${placeName}`)
        // render the results on a 'show' page: aka 'detail' page
        .then(apiRes => {
            console.log('this is apiRes.data: \n', apiRes.data)
            // a single place is apiRes.data[0]
            const foundPlace = apiRes.data[0]
            // res.send(foundPlace)
            res.render('places/show', { place: foundPlace, username, loggedIn, userId })
        })
        // if we get an error, display the error
        .catch(err => {
            console.log('error')
            res.redirect(`/error?error=${err}`)
        })
})


///////////////////////
//// Export Router ////
///////////////////////
module.exports = router