/*
 * Navigation layout without the priority-plus overflow menu.
 * All configured links remain visible; CSS positions the theme control.
 */

function updateNav() {
  var mastheadHeight = $('.masthead').height();
  $('body').css('padding-top', mastheadHeight + 'px');

  if ($(".author__urls-wrapper button").is(":visible")) {
    $(".sidebar").css("padding-top", "");
  } else {
    $(".sidebar").css("padding-top", mastheadHeight + "px");
  }
}

$(window).on('resize', updateNav);

if (screen.orientation && screen.orientation.addEventListener) {
  screen.orientation.addEventListener("change", updateNav);
}

updateNav();
