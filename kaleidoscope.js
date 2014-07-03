//
// kaleidoscope
//
// Copyright (c) 2014 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//    http://www.opensource.org/licenses/mit-license.php
//

window.onload = function() {

    var global = {};

    var preloadImages = function(completeHandler) {

        var imageList = document.getElementById('imageList').innerHTML.
            replace(/^\s+|\s+$/g,'').
            split(/\s+/g);
        var images = [];

        var loadImages = function() {

            var image = imageList.shift();

            var img = new Image();
            img.src = 'assets/' + image;
            img.onload = function() {
                images.push(img);
                if (imageList.length > 0) {
                    loadImages();
                } else {
                    completeHandler(images);
                }
            };
        };
        loadImages();
    };

    var createContent = function(rect, numParticles) {

        var ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = rect;
        ctx.canvas.height = rect;

        var particle = function() {

            var img = global.images[~~(Math.random() * global.images.length)];
            var x = Math.random() * rect;
            var y = Math.random() * rect;
            var vx = Math.random() * 0.1;
            var vy = Math.random() * 0.1;
            var rot = Math.random() * Math.PI;
            var vrot = Math.random() * 0.05 + 0.01;
            var scale = Math.random() * 0.7 + 0.3;

            var move = function() {

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.translate(
                    -img.width / 2 * scale,
                    -img.height / 2 * scale);
                ctx.transform(scale, 0, 0, scale, 0, 0);
                ctx.drawImage(img, 0, 0);
                ctx.restore();

                x += vx;
                y += vy;
                rot = (rot + vrot) % (Math.PI * 2);

                if (x > rect) {
                    x = rect;
                    vx = -vx;
                }
                if (x < 0) {
                    x = 0;
                    vx = -vx;
                }
                if (y > rect) {
                    y = rect;
                    vy = -vy;
                }
                if (y < 0) {
                    y = 0;
                    vy = -vy;
                }
            };

            return {move: move};
        };

        var particles = [];
        for (var i = 0; i < numParticles; i += 1) {
            particles.push(particle() );
        }

        var moveAll = function() {
            ctx.clearRect(0, 0, rect, rect);
            ctx.globalCompositeOperation = 'lighter';
            for (var i = 0; i < particles.length; i += 1) {
                particles[i].move();
            }
        };

        return {
            canvas : ctx.canvas,
            moveAll : moveAll
        }
    };

    var main = function() {

        var ctx = document.getElementById('cv').getContext('2d');

        var rect = 160;
        var len = rect * Math.sqrt(3) / 2;
        var ox = len / 2;
        var oy = len / Math.sqrt(3) / 2;
        var angle = 0;
        var deltaAngle = 0;
        var pressed = false;

        var content = createContent(rect, 32);

        !function() {

            var getAngle = function(p) {
                var cx = ctx.canvas.width / 2;
                var cy = ctx.canvas.height / 2;
                return Math.atan2(p.y - cy, p.x - cx);
            };

            var holdAngle = 0;

            var mousedown = function(points) {
                holdAngle = getAngle(points[0]);
                deltaAngle = 0;
                pressed = true;
            };
            var mousemove = function(points) {
                if (pressed) {
                    var currAngle = getAngle(points[0]);
                    deltaAngle = currAngle - holdAngle;
                    holdAngle = currAngle;
                    angle += deltaAngle;
                }
            };
            var mouseup = function(points) {
                pressed = points.length > 0;
            };

            var toPoints = function(event) {
                var p = [];
                for (var i = 0; i < event.touches.length; i += 1) {
                    p.push({x:event.touches[i].pageX, y:event.touches[i].pageY});
                }
                return p;
            };

            cv.addEventListener('mousedown', function(event) {
                mousedown([event]);
            } );
            cv.addEventListener('mousemove', function(event) {
                mousemove([event]);
            } );
            cv.addEventListener('mouseup', function(event) {
                mouseup([]);
            } );

            ctx.canvas.addEventListener('touchstart', function(event) {
                event.preventDefault();
                mousedown(toPoints(event) );
            } );
            ctx.canvas.addEventListener('touchmove', function(event) {
                mousemove(toPoints(event) );
            });
            ctx.canvas.addEventListener('touchend', function(event) {
                mouseup(toPoints(event) );
            } );
        }();

        var updateSize = function(w, h) {
            if (ctx.canvas.width != w || ctx.canvas.height != h) {
                ctx.canvas.width = w;
                ctx.canvas.height = h;
            }
        };

        var absmod = function(m, n) {
            var ret = m % n;
            return (ret < 0)? n + ret : ret;
        };

        var drawUnit = function(x, y, rot, inv) {

            ctx.save();

            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.translate(-ox, -oy);

            if (inv) {
                ctx.transform(1, 0, 0, -1, 0, 0);
            }

            for (var i = 0; i < rot; i += 1) {
                ctx.rotate(-Math.PI / 3 * 2);
                ctx.translate(-len, 0);
            }

            // clip triangle
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(len, 0);
            ctx.lineTo(len / 2, len * Math.sqrt(3) / 2);
            ctx.closePath();
            ctx.clip();

            // adjust
            ctx.translate(ox, oy);
            ctx.rotate(-angle);

            // content
            ctx.translate(-rect / 2, -rect / 2);
            ctx.drawImage(content.canvas, 0, 0);

            ctx.restore();
        };


        var updateDisplay = function(w, h) {

            content.moveAll();

            // center
            var cx = w / 2;
            var cy = h / 2;

            // misc
            var n = Math.ceil(Math.sqrt(w * w + h * h) / 2 / len) + 1;
            var mxx = Math.cos(angle) * len;
            var mxy = Math.sin(angle) * len;
            var myx = Math.cos(angle + Math.PI / 2) * len * Math.sqrt(3) / 2;
            var myy = Math.sin(angle + Math.PI / 2) * len * Math.sqrt(3) / 2;

            // render
            ctx.clearRect(0, 0, w, h);

            for (var x = -n; x <= n; x += 1) {
                for (var y = -n; y <= n; y += 1) {
                    var dx = x + ( (y % 2 != 0)? 0.5 : 0);
                    var dy = y;
                    var tx = mxx * dx + myx * dy + cx;
                    var ty = mxy * dx + myy * dy + cy;
                    var rot = (absmod(x, 3) + absmod(y, 2) * 2) % 3;
                    drawUnit(tx, ty, rot, false);
                    drawUnit(tx, ty, rot, true);
                }
            }
        };

        var render = function() {

            var w = window.innerWidth;
            var h = window.innerHeight;

            updateSize(w, h);

            updateDisplay(w, h);

            if (!pressed) {
                angle += deltaAngle;
                deltaAngle *= 0.99;
            }

            requestAnimationFrame(render);
        };
        render();
    };

    preloadImages(function(images) {
        global.images = images;
        main();
    } );
};