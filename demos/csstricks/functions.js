$(function(){
  'use strict';
  var $page = $('#main'),
      options = {
        prefetch: true,
        pageCacheSize: 2,
        onStart: {
          duration: 250, // Duration of our animation
          render: function ($container) {
            // Add your CSS animation reversing class
            $container.addClass('is-exiting');
            // Restart your animation
            smoothstate.restartCSSAnimations();
          }
        },
        onReady: {
          duration: 0,
          render: function ($container, $newContent) {
            // Remove your CSS animation reversing class
            $container.removeClass('is-exiting');
            // Inject the new content
            $container.html($newContent);

          }
        }
      },
      smoothstate = $page.smoothstate(options).data('smoothstate');
});