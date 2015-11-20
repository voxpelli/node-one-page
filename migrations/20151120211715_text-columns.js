'use strict';

exports.up = function (knex) {
  return Promise.all([
    knex.raw('ALTER TABLE agenda ALTER COLUMN description TYPE text'),
    knex.raw('ALTER TABLE speakers ALTER COLUMN description TYPE text'),
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.raw('ALTER TABLE agenda ALTER COLUMN description TYPE varchar(255)'),
    knex.raw('ALTER TABLE speakers ALTER COLUMN description TYPE varchar(255)'),
  ]);
};
