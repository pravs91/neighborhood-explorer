/*
* Clamped-width. 
* Usage:
*  <div data-clampedwidth=".myParent">This long content will force clamped width</div>
*
* Fix for a bootstrap bug in affix
* https://stackoverflow.com/questions/12536354/bootstrap-affix-plugin-with-fluid-layout
*/
$('[data-clampedwidth]').each(function () {
    var elem = $(this);
    var parentPanel = elem.data('clampedwidth');
    var resizeFn = function () {
        var sideBarNavWidth = $(parentPanel).width() - parseInt(elem.css('paddingLeft')) - parseInt(elem.css('paddingRight')) - parseInt(elem.css('marginLeft')) - parseInt(elem.css('marginRight')) - parseInt(elem.css('borderLeftWidth')) - parseInt(elem.css('borderRightWidth'));
        elem.css('width', sideBarNavWidth);
    };

    resizeFn();
    $(window).resize(resizeFn);
});

// function to collapse the results pane on smaller screens
(function($) {
    var $window = $(window);

    function resize() {
        // console.log("resizing");
        if ($window.width() < 992) {
            return $('#resultsPane').collapse('hide');
        } else {
            return $('#resultsPane').collapse('show');
        }
    }

    $window
        .resize(resize)
        .trigger('resize');
})(jQuery);        
