console.log(location.hash);
var Scann3r = {

    sio: null,

    start: function () {
        this.sio = io({path: "/ws"});
        this.switchNav(location.hash == '' ? 'control' : location.hash);
        this.initHandler();
        this.initSioHandler();
        this.crop.init();
        this.gallery.init();
        this.gallery.loadPage(0);
    },

    initSioHandler() {
        this.sio.on("info", (classname, text) => {
            $('.' + classname).text(text);
        });

        this.sio.on('updateCameraPreview', (data) => {
            $('#myCam').attr('src', data);
            $('#myCamDate').html(new Date().toISOString());
        });

        this.sio.on('setSliderValue', (name, value) => {
            let key = (typeof value == 'object') ? 'values' : 'value';
            $('.slider[data-slider=' + name + ']').slider('values', value);
        });

        this.sio.on('initSlider', this.slider.init);

        this.sio.on("disableControls", () => {
            $('.slider').slider('disable');
            $('.js-start').hide();
            $('.js-abort').show();
            this.crop.disable();
        });

        this.sio.on("enableControls", () => {
            $('.slider').slider('enable');
            $('.js-start').show();
            $('.js-abort').hide();
            this.crop.enable();
        });

        this.sio.on("newProject", (data) => {
            let t1 = this.gallery.createThumb(data);
            let t2 = this.gallery.createThumb(data);
            $(t2).attr('id', 'newest');
            this.gallery.prepend(t1);
            $('#dialog-finished').html(t2)
                .dialog({
                    width: 250,
                    height: 330
                });
        });

        this.sio.on("imgArea", this.crop.change);
    },

    initHandler: function () {
        var self = this;
        $('.js-start').click(() => {
            this.sio.emit('start');
        });

        $('.js-abort').click(() => {
            this.sio.emit('abort');
        });

        $('.js-calibrate').click(() => {
            $("#dialog-calibrate").dialog({
                width: 500,
                height: 300
            });
        });

        $('.js-rotor-move').click(function () {
            sio.emit('rotorCalibrate', $(this).data('steps'));
        });

        $('#js-invert').change(() => {
            sio.emit('rotorCalibrateDirection', $('#js-invert').prop('checked'));
        });

        $('.js-calibrate-done').click(() => {
            sio.emit('rotorCalibrateSetHome');
            $("#dialog-calibrate").dialog('close');
        });

        $('.js-turntable-sethome').click(() => {
            sio.emit('turntableCalibrateSetHome');
        });

        $('.js-nav').click(function (e) {
            self.switchNav($(this).attr('href'));
        });

    },

    switchNav: (hash) => {
        let section = hash.replace('#', '');
        $(".ui-dialog-content").dialog("close");
        $('.content').hide();
        $('#c-' + section).show();
        switch (section) {
            case 'control':
                Scann3r.crop.show();
                break;
            default:
                Scann3r.crop.hide();
                break;
        }
    },

    crop: {
        instance: null,
        data: {},
        init: () => {
            Scann3r.crop.instance = $('#myCam').imgAreaSelect({
                instance: true,
                handles: true,
                show: true,
                onSelectEnd: function (img, selection) {
                    let xf = 100 / img.width;
                    let yf = 100 / img.height;
                    let relativeSelection = {x: selection.x1 * xf, y: selection.y1 * yf, width: selection.width * xf, height: selection.height * yf};
                    Scann3r.sio.emit('imgArea', relativeSelection);
                    if (!selection.width || !selection.height) {
                        return;
                    }
                }
            });
        },
        change: (data) => {
            let w = $('#myCam').width() / 100;
            let h = $('#myCam').height() / 100;
            console.log("C", data);
            console.log("crop", data.x * w, data.y * h, data.x * w + data.width * w, data.y * h + data.height * h);
            Scann3r.crop.instance.setSelection(data.x * w, data.y * h, data.x * w + data.width * w, data.y * h + data.height * h)
            Scann3r.crop.instance.update();
            Scann3r.crop.data = data;
            console.log('storing crop data', data);
        },
        setOption: (key, value) => {
            if (Scann3r.crop.instance != null) {
                let options = {}
                options[key] = value;
                Scann3r.crop.instance.setOptions(options);
            }
        },
        disable: () => Scann3r.crop.setOption('disable', true),
        enable: () => Scann3r.crop.setOption('enable', true),
        hide: () => Scann3r.crop.setOption('hide', true),
        show: () => {
            if (Scann3r.crop.instance != null) {
                Scann3r.crop.change(Scann3r.crop.data);
            }
            Scann3r.crop.setOption('show', true);
        }


    },

    slider: {
        init: (name, options) => {
            options.name = name;
            let slider = $(`.slider[data-slider=${name}]`);
            let sliderOptions = {
                min: options.range.min,
                max: options.range.max,
                range: (typeof options.values != 'undefined'),
                slide: (event, ui) => Scann3r.slider.setValue(event, ui, name, options),
                change: (event, ui) => Scann3r.slider.setValue(event, ui, name, options),
            }
            if (typeof options.steps != 'undefined') {
                options.step = options.step;
            }
            slider.slider(sliderOptions);
            if (typeof options.values != 'undefined') {
                slider.slider('values', options.values);
                $('.slider[data-slider=rotorAngleRangeToScan]').slider('values', options.values);
            }
            if (typeof options.value != 'undefined') {
                slider.slider('value', options.value);
            }
        },
        setValue: function (event, ui, name, options) {

            let displayValue = (val, formated) => {
                let displayValue = (val * (options.displayRange.max - options.displayRange.min) / (options.range.max - options.range.min));
                if (formated) {
                    displayValue = displayValue.toFixed(options.displayDecimals ?? 0);
                    displayValue += options.displaySuffix;
                }
                return displayValue;

            }
            if (typeof ui.values != 'undefined') { // range slider
                for (let index in ui.values) {
                    $('#val-' + name + '-' + index).text(displayValue(ui.values[index], 1));
                }
            } else {
                $('#val-' + name).text(displayValue(ui.value, 1));
            }

            if (name == 'rotor' || name == 'rotorAngleRangeToScan') {
                $('.os-ring-preview').show();
                $('.os-ring-preview').css('transform', 'rotate(' + displayValue(ui.value) + 'deg)');
            }

            if (typeof event.originalEvent != 'undefined') {
                let value = typeof ui.values != 'undefined' ? ui.values : ui.value;
                Scann3r.sio.emit('slider', event.type, name, value);
            }
            if (event.type == 'slidechange') {
                $('.os-ring-preview').hide();
                if (typeof event.originalEvent == 'undefined' && name == 'rotor') {
                    $('.os-ring').css('transform', 'rotate(' + displayValue(ui.value) + 'deg)');
                }
            }
        }
    },

    gallery: {
        init: (sio) => {
            this.sio = sio;
            this.template = $('#thumb-template').clone();
            $('#thumb-template').remove();
        },
        loadPage: function (page) {
            let x = Scann3r.sio.emit('getProjects', 0, 100, (r) => {
                for (let n in r) {
                    this.append(this.createThumb(r[n]));
                }
            });
        },
        createThumb: (data) => {
            let t = this.template.clone();
            t.attr('id', 'foo');
            t.find('.thumbnail-image').attr('src', data.thumb);
            t.find('.thumbnail-text').text('#' + data.id);
            t.find('.zip').attr('href', '/' + data.id + '/images.zip');
            t.find('.trash').click(function () {
                if (confirm('Are you sure?')) {
                    Scann3r.sio.emit('delete', data.id, (err, r) => {
                        $(t).remove();
                    });
                }
            });
            t.find('.cloud').click(function () {
                Scann3r.sio.emit('proxy', data.id, (err, r) => {
                    $('.proxy-url').html(r.url);

                    $("#dialog-cloud").dialog(
                        {
                            width: 600,
                            height: 300
                        }
                    );
                });
            });
            return t;
        },
        append: (thumb) => {
            $('#thumbs').append(thumb);
        },
        prepend: (thumb) => {
            $('#thumbs').prepend(thumb);
        }
    }


}

$(() => {
    Scann3r.start();
});