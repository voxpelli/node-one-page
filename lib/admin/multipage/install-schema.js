'use strict';

module.exports = function (knex, Promise) {
  return knex.schema.createTable('pages', function (table) {
    table.increments('id', 10).primary();
    table.string('path', 255).notNullable().unique();
    table.string('title', 255).notNullable();
    table.string('template', 255);
    table.timestamp('created', true).notNullable().defaultTo(knex.raw('NOW()'));
    table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
  });
};
