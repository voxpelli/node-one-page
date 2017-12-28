
exports.up = function (knex, Promise) {
  return Promise.all([
    knex.schema.table('agenda', function (table) {
      table.string('image');
    }),

    knex.schema.createTable('tags', function (table) {
      table.increments('id').notNullable().primary();
      table.string('tag').notNullable();
    }),

    knex.schema.createTable('agenda_tags', function (table) {
      table.integer('agenda').notNullable();
      table.integer('tag').notNullable();
    }),
  ]);
};

exports.down = function (knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('tags'),
    knex.schema.dropTable('agenda_tags'),
    knex.schema.table('agenda', function (table) {
      table.dropColumn('image');
    }),
  ]);
};
