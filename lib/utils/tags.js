'use strict';

/**
 * Take a string of tags and splits it up into separate tags.
 *
 * - Parameter tagString: An array of comma-separated tags.
 *
 * - Returns: An array of tags.
 */
function separate(tagString) {
  return (tagString || '').split(',').map((tag) => {
    return tag.trim();
  });
}

/**
 * Updates the given agenda <-> tag relationship.
 *
 * - Parameter agenda: The ID of the agenda to update.
 * - Parameter tags: An array of tags to associate with the agenda.
 * - Parameter knex: A knex database connection.
 *
 * - Returns: A promise that resolves to `true` if the update was successfull.
 */
function updateAgendaTags(agenda, tags, knex) {
  return Promise.all([
    // Find id's for given tags
    fetchTagMap(tags, knex),
    // Find existing tags for the given agenda
    agendaTags(agenda, knex),
  ]).then(([tagMap, agendaTags]) => {
    const knownTags = Object.values(tagMap);

    return Promise.all([
      // Create the tags we don't know about.
      saveTags(unknownTags(tags, knownTags), knex)
        .then((ids) => {
          return knex('agenda_tags')
            .del()
            .where('agenda', agenda)
            .then(() => {
              return ids;
            });
        })
        .then((ids) => {
          ids = ids.map((t) => t.id || t);
          const currentTagIds = ids.concat(Object.keys(tagMap));
          return knex('agenda_tags').insert(currentTagIds.map((tag) => {
            return { tag: tag, agenda };
          }));
        }),
    ]);
  });
}

/**
 * Fetches a map of `id => tag` based on the input array of tag names.
 *
 * - Parameter tags: An array of tags to fetch ids for.
 * - Parameter knex: The knex database connection to use for fetching.
 *
 * - Returns: An object where the keys are ids and values are the corresponding tag names.
 */
function fetchTagMap(tags, knex) {
  return knex.select('id', 'tag')
    .from('tags')
    .whereIn('tag', tags)
    .then((tags) => {
      let t = {};
      tags.forEach((tag) => {
        t[tag.id] = tag.tag;
      });
      return t;
    });
}

/**
 * Fetches the tags for a given agenda. Only the tag id are returned.
 *
 * - Parameter id: The id of the agenda to lookup tags for.
 * - Parameter knex: The knex database connection to use.
 *
 * - Returns: An array of strings.
 */
function agendaTags(id, knex) {
  return knex.select('tag')
    .from('agenda_tags')
    .where('agenda', id)
    .then((tag) => {
      return tag.map((t) => { return t.tag; });
    });
}

/**
 * Returns the tag names associated with an agenda.
 *
 * - Parameter id: The id of the agenda to lookup tags for.
 * - Parameter knex: The knex database connection to use.
 *
 * - Returns: An array of tag names associated with the given agenda.
 */
function getAgendaTags(id, knex) {
  return agendaTags(id, knex)
    .then((tags) => {
      return knex('tags')
        .select('tag')
        .whereIn('id', tags)
        .then((tags) => {
          return tags.map((t) => {
            return t.tag;
          });
        });
    });
}

/**
 * Saves the given `tags` to the database.
 *
 * - Parameter tags: The tags to save.
 * - Parameter knex: The knex database connection to use for saving.
 *
 * - Returns: A promise that resolves to the insert ids of the inserted tags.
 */
function saveTags(tags, knex) {
  if (tags.length > 0) {
    const data = tags.map((tag) => { return { tag }; });
    return knex('tags').insert(data, ['id']);
  } else {
    return Promise.resolve(Object.keys(tags));
  }
}

/**
 * Finds the unsaved tags in `tags` given an array of `known` tags.
 *
 * - Parameter tags: The tags to filter.
 * - Parameter known: An array of known tags to filter against.
 *
 * - Returns: An array of tags found in `tags` not present in `known`.
 */
function unknownTags(tags, known) {
  return tags.filter((tag) => { return !known.includes(tag); });
}

module.exports = {
  separate,
  updateAgendaTags,
  getAgendaTags,
};
