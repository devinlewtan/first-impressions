# First Impressions / Judge me

## Overview

We all know the saying "don't judge a book by it's cover." First impressions are typically wrong and based on stereotypical profiling. But what if... someone explicitly requested you to judge them by an image?

First Impressions is a web-based game that presents users with a photo of a stranger and a quiz about them with general attributes like name, city, job title, and more contentious attributes like race, sexual orientation, dietary restrictions, etc. How much can we truly uncover from an image of a person? How much falls through the cracks? First Impressions is fun for both those guessing about others as well as for those who upload a photo - what do people judge about your cover?

## Data Model

The application will store Users, Profiles, and Questions (user-uploaded)

* users can have one profile (via references)
* each profile can have multiple questions (via references)

An Example User:

```javascript
{
  email: "devinlewtan@gmail.com",
  password: "$ecret$auce",
}
```

An Example Profile:

```javascript
{
  user_id: 'devinlewtan@gmail.com', // a reference to a User object
  image: {
    contentType: 'image/png',
    data: Buffer,
  },
  question_ids: [24trgve5g34, 34t5yhedfgw3, 4t3ergw434, 4t4wtwefsd],
}
```
An Example Question:

```javascript
{
	profile_id: "devinlewtan@gmail.com",
	question: "what is my name?",
  answers: [
    {letter: 'a', value: 'Devin', timesVoted: 0},
    {letter: 'b', value: 'Anna', timesVoted: 0},
    {letter: 'c', value: 'Erica', timesVoted: 0},
    {letter: 'd', value: 'Olivia', timesVoted: 0},
  ],
	correctAnswer: 'a',
};
```

## [Link to Commented First Draft Schema](https://github.com/nyu-csci-ua-0480-008-spring-2020/devinlewtan-final-project/blob/6b9c07d862e3c4e1b2b903ec97d8684cc32678c6/db.js#L4)

## Wireframes

/ - page for showing all profiles (one at a time)

![homepage](wireframes/wireframe_home.png)

/signup - page for registering new user (same wireframe as login right now)

![user signup](wireframes/wireframe_signin.png)

/login - page for user login 

![user login](wireframes/wireframe_signin.png)

/profile/ - page for creating a new profile 

![profile create](wireframes/wireframe_create_profile.png)

/profile/ - page for showing how your profile looks (same as home page for non registered users)

![profile example](wireframes/wireframe_example.png)

/profile/results - page for showing how your profile is being judged

![profile results](wireframes/wireframe_profile_results.png)

## [Site map](https://www.gloomaps.com/6H69np2mjP)

## User Stories or Use Cases

###### (non-registered)
1. as a user, I can pick one answer for each profile (quiz/poll style)
2. as a user, I can see the right answers once i've played 

###### (registered)
1. as a user, I can register an account on the site
2. as a user, I can log in to the site
3. as a user, I can upload a profile with the site
4. as a user, I can see what others guessed
5. as a user, I can share this with my friends (social media)
6. as a user, I can log out of the site

## Research Topics

* (4 points) Integrate user authentication
  * I'm going to be using passportJS for user authentication
* (3 points) Perform client side form validation using custom JavaScript
* (3 points) Use a server-side JavaScript module for user uploaded images (Multer)
  * accept user uploaded images using multer middleware. requires saving images to database in 64bit ecncoding before passing to front end. 

10 points total out of 8 required points 

## [Link to Initial Main Project File](https://github.com/nyu-csci-ua-0480-008-spring-2020/devinlewtan-final-project/blob/d7a93d52d3a7f440ab183288925033ad5d89984d/app.js#L1)

## Annotations / References Used

1. [passport.js authentication docs](http://passportjs.org/docs) - (add link to source code that was based on this)
2. [tutorial on quiz functionality / html](https://github.com/jamesqquick/Build-A-Quiz-App-With-HTML-CSS-and-JavaScript) - (add link to source code that was based on this)
