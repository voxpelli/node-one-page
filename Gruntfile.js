/*jslint node: true, white: true, indent: 2 */

"use strict";

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
          force   : true
        }
      }
    },
    jshint: {
      files: [
        'Gruntfile.js',
        'lib/**/*.js',
        'brandtheme/index.js',
        'brandtheme/sources/js/*.js',
        'brandtheme/sources/js/modules/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    lintspaces: {
      files: ['<%= jshint.files %>'],
      options: { editorconfig: '.editorconfig' }
    },
    concat: {
      options: {
        separator: ';'
      },
      footer: {
        src: [
          'basetheme/sources/js/vendor/jquery.js'
        ],
        dest: 'basetheme/public/footer.js'
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
          'basetheme/sources/js/admin.js'
        ],
        dest: 'basetheme/public/admin.js'
      }
    },
    uglify: {
      dist: {
        files: {
          'basetheme/public/footer.min.js': ['basetheme/public/footer.js'],
          'basetheme/public/admin.min.js': ['basetheme/public/admin.js'],
        }
      }
    },
    sass: {
      options: {
        files: {
          'basetheme/public/styles.css': 'basetheme/sources/sass/base.scss',
          'basetheme/public/admin.css': 'basetheme/sources/sass/admin.scss',
        },
        // Ensure that the child themes can include stuff from the parent theme
        loadPath: ['basetheme/sources/sass/'],
        quiet : true
      },
      test: {
        options: {
          check: true,
          quiet : false
        },
        files: ['<%= sass.options.files %>']
      },
      dist: {
        options: {
          style: 'compressed'
        },
        files: {
          'basetheme/public/styles.min.css': 'basetheme/sources/sass/base.scss',
          'basetheme/public/admin.min.css': 'basetheme/sources/sass/admin.scss',
        }
      },
      dev: {
        options: {
          style: 'expanded'
        },
        files: ['<%= sass.options.files %>']
      }
    },
    watch: {
      jshint : {
        files: ['<%= jshint.files %>'],
        tasks: ['lintspaces', 'jshint']
      },
      js : {
        files: [
          'basetheme/sources/js/vendor/*.js',
          'basetheme/sources/js/modules/*.js',
          'basetheme/sources/js/*.js'
        ],
        tasks: ['concat', 'uglify']
      },
      sass : {
        files: ['basetheme/sources/**/*.scss'],
        tasks: ['sass']
      },
      livereload: {
        options: { livereload: true },
        files: [
          'basetheme/public/**/*.css',
          'basetheme/public/**/*.js'
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-fontello');
  grunt.loadNpmTasks('grunt-lintspaces');

  grunt.registerTask('test', ['lintspaces', 'jshint', 'sass:test']);
  grunt.registerTask('build', ['lintspaces', 'jshint', 'concat', 'uglify', 'sass']);
  grunt.registerTask('default', ['build']);
};
