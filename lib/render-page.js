'use strict';

const _ = require('lodash');

const activeContentType = function (globalData, contentType) {
  //TODO: Check for a "supportedContentTypes" array property on the template that matches req.multipage.template and only include the supported content types in the rendered page
  return globalData || contentType.supportsMultiPage() || contentType.isDefaultTemplateData();
};

const renderPage = function (page, currentPage, title, pageTemplate, req) {
  var config = page.config;

  var wrappers = (currentPage ? undefined : ['front-wrapper', 'page', 'layout']);
  var frontData = {};
  var fetchedData;

  currentPage = currentPage || 0;
  title = currentPage ? title : undefined;
  pageTemplate = page.getPageTemplates()[pageTemplate || 'default'] || {
    globalData: true,
    addNoChildren: false,
  };

  // Figure out what data we want to fetch
  _.each(page.contentTypes, function (contentType) {
    if (activeContentType(pageTemplate.globalData, contentType)) {
      frontData[contentType.getRenderingName()] = contentType.getData(currentPage);
    }
  });

  // Fetch that data and then link it to each content type
  fetchedData = Promise.all(_.values(frontData))
    .then(results => _.zipObject(_.keys(frontData), results));

  // Then start with the actual rendering
  return fetchedData.then(function (data) {
    var dictionary = data.dictionary || {};
    var jsDictionary = dictionary.jsDictionary;

    return {
      data : data,
      path: (req || {}).path,
      title : title,
      dictionary : dictionary,
      jsDictionary : jsDictionary,
      activeFeatures : config.features,
      clientFeatures : _.pick(config.features, ['video']),
    };
  })
  .then(function (templateData) {
    var children = [];

    if (pageTemplate.addNoChildren) {
      return { templateData, children };
    }

    //TODO: Let the themes decide on what order to render stuff! And append everything else at the end?
    children = children.concat(page.config.front.order);
    var position;

    _.each(page.contentTypes, function (contentType, contentTypeName) {
      if (!activeContentType(pageTemplate.globalData, contentType)) {
        return;
      }

      var dataKey = contentType.getId();
      var template = contentType.getTemplate(templateData.data[dataKey] || {}, templateData.dictionary);
      var position = children.indexOf(contentTypeName);

      if (template) {
        template = _.extend({
          templateWrappers : 'front-section',
        }, template);
      }

      if (position === -1) {
        children.push(template);
      } else {
        children[position] = template;
      }
    });

    position = children.indexOf('video');
    if (position !== -1 && templateData.activeFeatures.video) {
      children[position] = { template : 'video' };
    }

    position = children.indexOf('map');
    if (position !== -1 && templateData.activeFeatures.map) {
      children[position] = {
        templateWrappers : 'front-section',
        template : 'embedded-map',
        variables : {
          menuName : 'Hitta hit',
          name : 'location',
          header : 'Hitta hit',
        },
      };
    }

    children = _.filter(children, function (value) {
      return _.isObject(value);
    });

    return { templateData, children };
  })
  .then(renderData => page.render(renderData.children, renderData.templateData, wrappers, pageTemplate.template));
};

module.exports = renderPage;
