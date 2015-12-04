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
        '!basetheme/sources/js/vendor/**/*.js',
      ],
    },
    lintspaces: {
      files: [
        '<%= eslint.src %>',
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
    concat: {
      options: {
        separator: ';',
      },
      footer: {
        src: [
          'basetheme/sources/js/vendor/jquery.js',
        ],
        dest: 'basetheme/public/footer.js',
      },
      admin: {
        src: [
          'basetheme/sources/js/vendor/base58.js',
          'basetheme/sources/js/vendor/jquery.form.js',
          'basetheme/sources/js/vendor/underscore.js',
          'basetheme/sources/js/vendor/eventable.js',
          'basetheme/sources/js/vendor/sir-trevor.js',
          'basetheme/sources/js/modules/flickr-block.js',
          'basetheme/sources/js/modules/story-block.js',
          'basetheme/sources/js/vendor/picker.js',
          'basetheme/sources/js/vendor/picker.legacy.js',
          'basetheme/sources/js/vendor/picker.time.js',
          'basetheme/sources/js/admin.js',
        ],
        dest: 'basetheme/public/admin.js',
      },
    },
    uglify: {
      dist: {
        files: {
          'basetheme/public/footer.min.js': ['basetheme/public/footer.js'],
          'basetheme/public/admin.min.js': ['basetheme/public/admin.js'],
        },
      },
    },
    sass: {
      options: {
        files: {
          'basetheme/public/styles.css': 'basetheme/sources/sass/base.scss',
          'basetheme/public/admin.css': 'basetheme/sources/sass/admin.scss',
        },
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
        files: ['<%= sass.options.files %>'],
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
          'jquery.js': 'jquery:main',
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
        files: ['basetheme/sources/js/**/*.js'],
        tasks: ['build-js'],
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
        ],
      },
    },
  });

  [
    'grunt-notify',
    'grunt-sass',
    'grunt-contrib-watch',
    'grunt-contrib-uglify',
    'grunt-contrib-concat',
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

  grunt.registerTask('build-js', ['concat', 'uglify']);
  grunt.registerTask('build-css', ['sass:dev', 'sass:dist']);
  grunt.registerTask('build', ['test', 'build-js', 'build-css']);

  grunt.registerTask('bower', ['bowercopy', 'build']);

  grunt.registerTask('default', ['build']);

  grunt.event.on('coverage', function (lcov, done) {
    if (!process.env.TRAVIS) { return done(); }

    require('coveralls').handleInput(lcov, function (err) {
      if (err) { return done(err); }
      done();
    });
  });
};
