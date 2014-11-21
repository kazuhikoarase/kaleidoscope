//
// kaleidoscope
//
// Copyright (c) 2014 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

var kaleidoscope = function() {

  var preloadImages = function(imageSrcList, completeHandler) {
    var images = [];
    for (var i = 0; i < imageSrcList.length; i += 1) {
      !function() {
        var img = new Image();
        img.src = imageSrcList[i];
        img.onload = function() {
          images.push(img);
          if (images.length == imageSrcList.length) {
            completeHandler(images);
          }
        };
      }();
    }
  };

  var createContent = function(rect, ox, oy, images, numParticles) {

    var _deltaAngle = 0;

    var ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = rect;
    ctx.canvas.height = rect;

    var bufCtx = document.createElement('canvas').getContext('2d');
    bufCtx.canvas.width = rect;
    bufCtx.canvas.height = rect;

    var particle = function() {

      var img = images[~~(Math.random() * images.length)];
      var ax = 0;
      var ay = 0;
      var vx = 0;
      var vy = 0;
      var x = Math.random() * rect;
      var y = Math.random() * rect;
      var arot = 0;
      var vrot = 0;
      var rot = Math.random() * Math.PI;
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

        vx += ax;
        vy += ay;
        vrot += arot;
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

        var dx = x - ox;
        var dy = y - oy;
        var r = Math.sqrt(dx * dx + dy * dy);
        var t = Math.atan2(dy, dx) + Math.PI / 2;
        var a = _deltaAngle * r / rect;
        ax = Math.cos(t) * a;
        ay = Math.sin(t) * a;
        arot = a * 0.1;
        vx *= 0.99;
        vy *= 0.99;
        vrot *= 0.99;
      };

      return {move: move};
    };

    var particles = [];
    for (var i = 0; i < numParticles; i += 1) {
      particles.push(particle() );
    }

    var moveAll = function() {
      bufCtx.clearRect(0, 0, rect, rect);
      bufCtx.drawImage(ctx.canvas, 0, 0);
      ctx.clearRect(0, 0, rect, rect);
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.drawImage(bufCtx.canvas, 0, 0);
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particles.length; i += 1) {
        particles[i].move();
      }
    };

    var setDeltaAngle = function(deltaAngle) {
      _deltaAngle = deltaAngle;
    };
    
    return {
      canvas : ctx.canvas,
      moveAll : moveAll,
      setDeltaAngle : setDeltaAngle
    };
  };

  return function(ctx, imageSrcList, bgColor) {

    var rect = 160;
    var len = rect * Math.sqrt(3) / 2;
    var ox = len / 2;
    var oy = len / Math.sqrt(3) / 2;
    var angle = 0;
    var deltaAngle = 0;
    var pressed = false;
    var holdAngle = 0;
    var content = null;

    preloadImages(imageSrcList, function(images) {
      init(images);
    } );

    var init = function(images) {

      content = createContent(rect, ox, oy, images, 32);

      var render = function() {
  
        var size = ks.getSize();
        updateSize(size.width, size.height);
        updateDisplay(size.width, size.height);
  
        if (!pressed) {
          angle += deltaAngle;
          deltaAngle *= 0.99;
        }
        content.setDeltaAngle(deltaAngle);
        
        requestAnimationFrame(render);
      };
      render();
    };

    var getAngle = function(p) {
      var cx = ctx.canvas.width / 2;
      var cy = ctx.canvas.height / 2;
      return Math.atan2(p.y - cy, p.x - cx);
    };

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
    var mouseDownHandler = function(event) {
      mousedown([event]);
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    };
    var mouseMoveHandler = function(event) {
      mousemove([event]);
    };
    var mouseUpHandler = function(event) {
      mouseup([]);
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    ctx.canvas.addEventListener('mousedown', mouseDownHandler);

    var touchStartHandler = function(event) {
      event.preventDefault();
      mousedown(toPoints(event) );
      document.addEventListener('touchmove', touchMoveHandler);
      document.addEventListener('touchend', touchEndHandler);
    };
    var touchMoveHandler = function(event) {
      mousemove(toPoints(event) );
    };
    var touchEndHandler = function(event) {
      mouseup(toPoints(event) );
      document.removeEventListener('touchmove', touchMoveHandler);
      document.removeEventListener('touchend', touchEndHandler);
    };
    ctx.canvas.addEventListener('touchstart', touchStartHandler);

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

      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }

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
  
    var ks = {
      getSize: function() {
        return {
          width: window.innerWidth,
          height: window.innerHeight
        };
      }
    };
    return ks;
  };
}();
