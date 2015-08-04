(function ($) {
    $.fn.countdown = function (options) {
        var settings = $.extend({ endDateTime: new Date() }, options);

        return this.each(function () {
            var timeoutInterval = null;
            var container = $(this);
            settings.endDateTime = new Date(container.data("countdown"))

            updateCounter();
            getCountDown();

            function getCountDown() {
                clearTimeout(timeoutInterval);
                timeoutInterval = setTimeout(function () {
                    updateCounter();
                }, 1000);
            }

            function getCurrentCountDown() {
                var currentDateTime = new Date();
                var diff = parseFloat(settings.endDateTime - currentDateTime);
                var seconds = 0;
                var minutes = 0;
                var hours = 0;
                var total = parseFloat(((((diff / 1000.0) / 60.0) / 60.0) / 24.0));
                var days = parseInt(total);
                total -= days;
                total *= 24.0;
                hours = parseInt(total);
                total -= hours;
                total *= 60.0;
                minutes = parseInt(total);
                total -= minutes;
                total *= 60;
                seconds = parseInt(total);
                return { days: formatNumber(Math.max(0, days), true), hours: formatNumber(Math.max(0, hours), false), minutes: formatNumber(Math.max(0, minutes), false), seconds: formatNumber(Math.max(0, seconds), false) };
            }

            function updateCounter() {
                var countDown = getCurrentCountDown();

                var days = container.find(".days .countdown-time").first();
                var hours = container.find(".hours .countdown-time").first();
                var minutes = container.find(".minutes .countdown-time").first();
                var seconds = container.find(".seconds .countdown-time").first();

                var dayVal = days.html();
                var hourVal = hours.html();
                var minuteVal = minutes.html();
                var secondVal = seconds.html();

                if (countDown.days == 0) { days.parent().addClass("zero"); }
                if (countDown.hours == 0) { hours.parent().addClass("zero"); }
                if (countDown.minutes == 0) { minutes.parent().addClass("zero"); }
                if (countDown.seconds == 0) { seconds.parent().addClass("zero"); }

                if (dayVal != countDown.days) { days.html(countDown.days); }
                if (hourVal != countDown.hours) { hours.html(countDown.hours); }
                if (minuteVal != countDown.minutes) { minutes.html(countDown.minutes); }
                if (secondVal != countDown.seconds) { seconds.html(countDown.seconds); }

                getCountDown();
            }

            function formatNumber(number, isday) {
                var strNumber = number.toString();
                return strNumber;
            }
        });
    }
})(jQuery);
