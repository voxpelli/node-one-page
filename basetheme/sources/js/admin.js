/*jslint browser: true */
/* global confirm, ace, SirTrevor */
(function ($) {
  "use strict";

  var sirTrevorInstance;

  $('button[name="deleteimage"]').click(function (e) {
    if (!confirm('Säker på att du vill ta bort bilden?')) {
      e.preventDefault();
    }
  });

  $('button[name="remove"]').closest('form').ajaxForm({
    dataType : 'json',
    beforeSubmit : function (arr, $form) {
      var title = $form.closest('tr').find('.title').text();
      return confirm('Säker på att du vill ta bort "' + title + '"?');
    },
    success : function (data, statusText, xhr, $form) {
      if (data && data.success) {
        $form.closest('tr').remove();
      }
    }
  });

  (function () {
    var $menu = $('<ul />').addClass('menu');
    $('div.admin-puffs .admin-part h3').each(function (index) {
      var $this = $(this), $adminPart = $this.closest('.admin-part'), $a;
      $a = $('<a />')
        .addClass('button')
        .attr('href', '#' + $this.attr('id'))
        .text($this.text())
        .appendTo($menu)
        .wrap('<li />')
        .click(function () {
          $(this).closest('li').addClass('active').siblings('li').removeClass('active');
          $adminPart.show().siblings('div').hide();
          return false;
        });
      if (window.location.hash === '#' + $this.attr('id') || index === 0) {
        $a.click();
      }
      $a.attr('id', $this.remove().attr('id'));
    });
    $menu.insertAfter('div.admin-puffs > h3');
  }());

  // ACE Editor
  $('textarea.syntax-highlight').each(function () {
    var $textarea = $(this)
      , $form = $textarea.closest('form')
      , classes = $textarea.attr('class') ? $textarea.attr('class').split(' ') : []
      , syntax
      , matches
      , editorElem
      , editor
      , i
      , length;

    for (i = 0, length = classes.length; i < length; i += 1) {
      matches = classes[i].match(/syntax-highlight-(\w+)/i);
      if (matches) {
        syntax = matches[1];
        break;
      }
    }

    editorElem = $('<div />').insertBefore($textarea.hide());

    editor = ace.edit(editorElem.get(0));
    editor.setTheme("ace/theme/monokai");
    if (syntax) {
      editor.getSession().setMode("ace/mode/" + syntax);
    }
    editor.getSession().setTabSize(2);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setValue($textarea.val());

    $form.submit(function () {
      $textarea.val(editor.getSession().getValue());
    });
  });

  if ($('.sir-trevor').length) {
    if (SirTrevor.Blocks.Flickr && (
        window.vtConfig.admin.blockTypes.indexOf('Flickr') !== -1 ||
        window.vtConfig.admin.blockTypes.indexOf('Story') !== -1
    )) {
      SirTrevor.Blocks.Flickr.prototype.flickrKey = window.vtConfig.admin.flickrKey;
    }

    sirTrevorInstance = new SirTrevor.Editor({
      blockTypes: window.vtConfig.admin.blockTypes,
      el: $('.sir-trevor').first()
    });
  }

  // Date picker
  var $start = $('input#id_start')
    , $stop = $('input#id_stop')
    , oldStartTime
    , removeUpdateClass;

  $('input#id_start, input#id_stop').pickatime({
    clear: false,
    format: 'HH:i',
    interval: 15,
    container: $('#main'),
    min: [8,0],
    max: [22,0]
  });

  if ($start.val()) {
    oldStartTime = $start.pickatime('picker').get('select');
    $stop.pickatime('picker').set('min', [oldStartTime.hour, oldStartTime.mins]);
    oldStartTime = oldStartTime.time;
  }

  removeUpdateClass = function () {
    $(document).off('.vtonepage', removeUpdateClass);
    $stop.removeClass('updated');
  };

  $start.change(function () {
    var stopPicker, startVal, stopVal;

    stopPicker = $stop.pickatime('picker');
    startVal = $start.pickatime('picker').get('select');

    if ($stop.val() && oldStartTime) {
      stopVal = stopPicker.get('select');
      stopPicker.set('select', stopVal.time + startVal.time - oldStartTime);
      $stop.addClass('updated');
      $(document)
        .one('keydown.vtonepage', removeUpdateClass)
        .one('mousemove.vtonepage', removeUpdateClass);
    }
    stopPicker.set('min', [startVal.hour, startVal.mins]);

    oldStartTime = startVal.time;
  });
}($));
