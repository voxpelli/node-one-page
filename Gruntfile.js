'use strict';

module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    fontello: {
      dist: {
        options: {
          config  : 'basetheme/sources/fontello-config.json',
          fonts   : 'basetheme/public/font',
          styles  : 'basetheme/sources/sass/vendor/fontello',
          scss    : true,
          force   : true,
        },
      },
    },
    eslint: {
      src: [
        'Gruntfile.js',
        'lib/**/*.js',
        'migrations/**/*.js',
        'test/**/*.js',
        'basetheme/index.js',
        'basetheme/sources/js/**/*.js',
      ],
    },
    lintspaces: {
      files: [
        '<%= eslint.src %>',
        '!basetheme/sources/js/vendor/**/*.js',
        'basetheme/sources/sass/**/*.scss',
        '!basetheme/sources/sass/vendor/**/*.scss',
      ],
      options: { editorconfig: '.editorconfig' },
    },
    'dependency-check': {
      files: ['<%= eslint.src %>'],
      options: {
        excludeUnusedDev: true,
        ignoreUnused: ['pg'],
      },
    },
    mocha_istanbul: {
      options: {
        root: './lib',
        ui: 'tdd',
        coverage: true,
        reportFormats: ['lcov'],
      },
      all: {
        src: 'test/**/*.spec.js',
      },
    },
    browserify: {
      options: {
        // TODO: Can this maybe be replaced with the "full-paths: false" option instead?
        plugin: [require('bundle-collapser/plugin')],
      },
      dist: {
        files: {
          'basetheme/public/admin.js': ['basetheme/sources/js/admin.js'],
        },
      },
      watch: {
        options: {
          watch: true,
        },
        files: ['<%= browserify.dist.files %>'],
      },
    },
    uglify: {
      options: {
        screwIE8: true,
      },
      dist: {
        files: {
          'basetheme/public/admin.min.js': ['basetheme/public/admin.js'],
        },
      },
    },
    sass: {
      options: {
        // Ensure that the child themes can include stuff from the parent theme
        includePaths: ['basetheme/sources/sass/'],
      },
      dist: {
        options: {
          outputStyle: 'compressed',
        },
        files: {
          'basetheme/public/styles.min.css': 'basetheme/sources/sass/base.scss',
          'basetheme/public/admin.min.css': 'basetheme/sources/sass/admin.scss',
        },
      },
      dev: {
        options: {
          outputStyle: 'expanded',
          sourceMap: true,
          sourceMapContents: true,
        },
        files: {
          'basetheme/public/styles.css': 'basetheme/sources/sass/base.scss',
          'basetheme/public/admin.css': 'basetheme/sources/sass/admin.scss',
        },
      },
    },
    bowercopy: {
      options: {
        clean: true,
      },
      js: {
        options: {
          destPrefix: 'basetheme/sources/js/vendor',
        },
        files: {
          'jquery.form.js': 'jquery-form:main',
          'picker.js': 'pickadate/lib/picker.js',
          'picker.legacy.js': 'pickadate/lib/legacy.js',
          'picker.time.js': 'pickadate/lib/picker.time.js',
        },
      },
      sass: {
        options: {
          destPrefix: 'basetheme/sources/sass/vendor',
        },
        files: {
          'color-helpers': 'sass-color-helpers/stylesheets/color-helpers/*.scss',
          '_color-helpers.scss': 'sass-color-helpers:main',
          '_normalize.scss': 'normalize-css:main',
          '_pickadate.default.scss': 'pickadate/lib/themes/default.css',
          '_pickadate.default.time.scss': 'pickadate/lib/themes/default.time.css',
        },
      },
    },
    watch: {
      eslint : {
        files: ['<%= eslint.src %>'],
        tasks: ['test-js'],
      },
      js : {
        files: [
          'basetheme/public/**/*.js',
          '!basetheme/public/**/*.min.js',
        ],
        tasks: ['uglify'],
      },
      sass : {
        files: ['basetheme/sources/sass/**/*.scss'],
        tasks: ['build-css'],
      },
      livereload: {
        options: { livereload: true },
        files: [
          'basetheme/public/**/*.css',
          'basetheme/public/**/*.js',
          '!basetheme/public/**/*.min.js',
        ],
      },
    },
  });

  [
    'grunt-notify',
    'grunt-sass',
    'grunt-contrib-watch',
    'grunt-contrib-uglify',
    'grunt-browserify',
    'grunt-fontello',
    'grunt-eslint',
    'grunt-lintspaces',
    'grunt-mocha-istanbul',
    'dependency-check',
    'grunt-bowercopy',
  ].forEach(grunt.loadNpmTasks.bind(grunt));

  grunt.registerTask('setTestEnv', 'Ensure that environment (database etc) is set up for testing', function () {
    process.env.NODE_ENV = 'test';
  });

  grunt.registerTask('test-mocha', ['setTestEnv', 'mocha_istanbul:all']);
  grunt.registerTask('test-js', [
    'lintspaces',
    'eslint',
    'dependency-check',
    'test-mocha',
  ]);
  grunt.registerTask('test-css', [/* 'sasslint' */]);
  grunt.registerTask('test', ['test-js', 'test-css']);

  grunt.registerTask('build-js', ['browserify:dist', 'uglify']);
  grunt.registerTask('build-css', ['sass:dev', 'sass:dist']);
  grunt.registerTask('build', ['test', 'build-js', 'build-css']);

  grunt.registerTask('bower', ['bowercopy', 'build']);

  grunt.registerTask('full-watch', ['browserify:watch', 'watch']);

  grunt.registerTask('default', ['build']);

  grunt.event.on('coverage', function (lcov, done) {
    if (!process.env.TRAVIS) { return done(); }

    require('coveralls').handleInput(lcov, function (err) {
      if (err) { return done(err); }
      done();
    });
  });
};
