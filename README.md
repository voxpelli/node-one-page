# Valtech One Page

Quick and easy one pagers for events and other small information pages.

## What's this?

A simple, quick, pragmatically built code base for the creation of one pagers. There's a single admin page. There's a single enduser page. Built mainly for events who easily want to get some data up quickly. Used on [Valtech Day](http://www.valtechday.se/) 2013-2014 and by The Conference for their archive page of 2014. Also used by Valtech for some other person oriented sites like the presentation of the 2013 [Talent Program](http://talang.valtech.se/).

Built to be easily hostable on [Heroku](http://www.heroku.com/).

## Requirements

* Node.js 0.10
* Postgres 9.3
* [Cloudinary](http://cloudinary.com/) account (Optional)
* Grunt (Development only)
* Sass 3.3 (Development only)
* [Foreman](http://ddollar.github.io/foreman/) (Optional – recommended though in a development environment as this project is built around `Procfile` and `.env` files to simulate a Heroku environment. As currently only one process is used and a backup `.env` parser is provided Foreman isn't strictly needed though)

## To install and run

### Locally

1. Set up a new PostgreSQL database
2. Set up the environment variables (by eg. copying `sample.env` to `.env`)
3. Run `npm run install-schema` to set up the tables
4. Run `foreman start` or `npm start` to start the application

### Heroku

1. Set up a new application
2. Set up a database for the new application
3. Set up environment variables using `heroku config`
4. Push the code to Heroku
5. Use a [One-Off Dyno](https://devcenter.heroku.com/articles/one-off-dynos) to set up the tables: `heroku run npm run install-schema`

## To update

### Locally

Just run `npm run migrate-schema`.

### Heroku

1. Before you push any code you may want to activate the [Maintenance Mode](https://devcenter.heroku.com/articles/maintenance-mode) if it is a breaking update
2. Push the new code and let Heroku deploy it
3. Use a [One-Off Dyno](https://devcenter.heroku.com/articles/one-off-dynos) to do the migration: `heroku run npm run migrate-schema`
4. If you activated the [Maintenance Mode](https://devcenter.heroku.com/articles/maintenance-mode) – then remember to deactivate it as well

## Revert an update

Just run `npm run rollback-schema` locally or, if on Heroku, use a [One-Off Dyno](https://devcenter.heroku.com/articles/one-off-dynos) to do the rollback: `heroku run npm run rollback-schema` And afterwards – of course make sure that you also revert your code to a version that matches the schema – but you already knew that of course :)

## To verify code and build theme

Just run `grunt` to verify and build the code – or to continuously do that, run `grunt watch` instead. Ensure that you have [installed Sass](http://sass-lang.com/install) first (tested with version 3.3) or else the compilation will fail.

## Configuration

You can set these up locally by simply copying `sample.env` to `.env` and changing the values in that file.

### Required

* **DATABASE_URL** - a configuration URL for the PostgreSQL database
* **VTONEPAGE_COOKIE_SECRET** - a secret for the cookie that will make sure a user stays logged in
* **VTONEPAGE_HOSTNAME** - the hostname of the place your hosting the application on. Used when eg. constructing the callback URL sent to the GitHub API and to ensure that the site doesn't appear on duplicated URL:s

### Optional

* **CLOUDINARY_URL** – a configuration URL for the Cloudinary account (used for image uploading)
* **VTONEPAGE_TWITTER_KEY** - a Twitter OAuth consumer key – used for logging in with Twitter
* **VTONEPAGE_TWITTER_SECRET** - a GitHub OAuth consumer secret – used for logging in with Twitter
* **VTONEPAGE_GITHUB_KEY** - a GitHub OAuth 2 consumer id – used for logging in with GitHub
* **VTONEPAGE_GITHUB_SECRET** - a GitHub OAuth 2 consumer secret – used for logging in with GitHub
* **VTONEPAGE_DISABLE_FEATURES** – a space separated list of default features to disable
* **VTONEPAGE_DISABLE_FEATURES** – a space separated list of non-default features to activate
* **VTONEPAGE_BLOCK_TYPES** – a space separated list of Sir-Trevor block types to activate (by default Heading, List, Video, Quote, Text, Flickr and Story are all shown)
* **VTONEPAGE_FLICKR_KEY** – a Flickr API key used by the Flickr and Story Sir-Trevor blocks to embed images from Flickr URL:s
* **VTONEPAGE_PREFIX** – if someone for some reason dislikes the "VTONEPAGE__" prefix for the environment variables, then it can be changes through this very environment variable.

### Available features

* speakers
* agenda
* video
* map
* customcss
* dictionary
* images
* accountadmin
* puff
* blocks (disabled by default)

## Create a custom instance

TODO
