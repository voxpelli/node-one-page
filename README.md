# Node One Page

Quick and easy one pagers for events and other small information pages.


[![Build Status](https://travis-ci.org/voxpelli/node-one-page.svg?branch=master)](https://travis-ci.org/voxpelli/node-one-page)
[![Coverage Status](https://coveralls.io/repos/voxpelli/node-one-page/badge.svg?branch=master&service=github)](https://coveralls.io/github/voxpelli/node-one-page?branch=master)
[![Dependency Status](https://gemnasium.com/voxpelli/node-one-page.svg)](https://gemnasium.com/voxpelli/node-one-page)

## What's this?

A simple, quick, pragmatically built code base for the creation of one pagers. There's a single admin page. There's a single enduser page. Built mainly for events who easily want to get some data up quickly. Used on Valtech Day 2013-2014 and by The Conference for their archive page of 2014. Also used by Valtech for some other person oriented sites like the presentation of the 2013 Talent Program.

Built to be easily hostable on [Heroku](http://www.heroku.com/).

## Requirements

* Node.js >=5.x
* Postgres 9.4 (or maybe 9.3)
* [Cloudinary](http://cloudinary.com/) account (Optional)
* Grunt (Development only)

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

Just run `grunt` to verify and build the code – or to continuously do that, run `grunt watch` instead.

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

### Minimal way

Add this project as a dependency to your project, <del>`npm install --save vtonepage`</del> – do `npm install --save voxpelli/node-one-page` for now, create a new [Tema theme](https://www.npmjs.org/package/tema) that inherits from `require('vtonepage').basetheme` and then launch an instance of this project using that theme and connect it to a server:

```javascript
var VTOnePage = require('vtonepage');

VTOnePage.subclassOrRun(module, {
  theme : require('./newCoolTheme'),
});
```

### Advanced way

Set up a Grunt workflow similar to the base theme and include the path to the base theme's Sass files in your Sass load path to reuse parts of the base theme override the default colors of the base theme etc.

Also set up your new instance to proxy calls to the database installation and migration system. Do that by adding a `knexfile.js` looking like:

```javascript
module.exports = require('./').knexConfig();
```

And npm scripts in your `package.json` looking like:

```
"scripts": {
  "install-schema":  "node -e \"require('.').runMigrationTask('install');\"",
  "migrate-schema":  "node -e \"require('.').runMigrationTask('migrate');\"",
  "rollback-schema": "node -e \"require('.').runMigrationTask('rollback');\""
}
```

### Extend content types

There are two officially available content types to extend:

* `VTOnePage.BaseType` – the most basic content type that every content type should inherit from. Has no basic data storage – it's up to each individual content type to deal with that.
* `VTOnePage.VarsType` – a JSON-storage backed content type that simple content types can inherit from. As long as no advanced queries or big amounts of data are going to be stored this is the perfect content type.

The source for these and for internal content types that extend these ones can be found in `lib/admin/`.

### Development notes

To update Bower dependencies of this project and get the new files copied into place, do:

```
grunt bower
```
