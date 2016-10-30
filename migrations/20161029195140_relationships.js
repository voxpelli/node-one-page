'use strict';

exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable('speaker_agendas', function (table) {
      table.increments('id').notNullable().primary();
      table.integer('speaker').notNullable().index();
      table.integer('agenda').notNullable().index();

      table.unique(['speaker', 'agenda']);
    }),
    knex.schema.createTable('agenda_agendas', function (table) {
      table.increments('id').notNullable().primary();
      table.integer('agenda_from').notNullable().index();
      table.integer('agenda_to').notNullable().index();

      table.unique(['agenda_from', 'agenda_to']);
    }),
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
      knex.schema.dropTable('speaker_agendas'),
      knex.schema.dropTable('agenda_agendas')
  ]);
};
