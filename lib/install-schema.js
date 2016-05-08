'use strict';

module.exports = function (knex, Promise) {
  return Promise.all([
    knex.schema.createTable('accounts', function (table) {
      table.increments('id').notNullable().primary();
      table.string('service').notNullable();
      table.string('identifier').notNullable();
      table.string('external_id');
      table.string('role', true).notNullable().defaultTo('admin');
      table.timestamp('lastlogin', true);

      table.unique(['service', 'identifier']);
      table.unique(['service', 'external_id']);
    }),

    knex.schema.createTable('session', function (table) {
      table.string('sid').primary();
      table.json('sess').notNullable();
      table.timestamp('expire', true).notNullable();
    }),

    knex.schema.createTable('agenda', function (table) {
      table.increments('id').primary();
      table.boolean('published').notNullable().defaultTo(true).index();
      table.string('title').notNullable();
      table.time('start');
      table.time('stop');
      table.string('speaker');
      table.text('description');
      table.integer('category').notNullable().defaultTo(0);
      table.json('data', true);
      table.timestamp('created', true).notNullable().defaultTo(knex.raw('NOW()'));
      table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
    }),

    knex.schema.createTable('speakers', function (table) {
      table.increments('id').primary();
      table.integer('page').notNullable().defaultTo(0);
      table.boolean('published').notNullable().defaultTo(true).index();
      table.string('name').notNullable();
      table.text('description');
      table.json('links');
      table.string('image');
      table.json('data', true);
      table.timestamp('created', true).notNullable().defaultTo(knex.raw('NOW()'));
      table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
    }),

    knex.schema.createTable('vars', function (table) {
      table.string('key').notNullable();
      table.integer('page').notNullable().defaultTo(0);
      table.json('value').notNullable();
      table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
      table.primary(['key', 'page']);
    }),
  ]);
};
