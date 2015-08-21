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

  var createContent = function(rect, ox, oy, images, opts) {

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
    for (var i = 0; i < opts.numParticles; i += 1) {
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
      if (opts.globalCompositeOperation) {
        ctx.globalCompositeOperation = opts.globalCompositeOperation;
      }
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

  var defaultOpts = {
    numParticles: 32,
    bgColor: '#000000',
    shape: 'triangle',
    rotScreen: true,
    postInitHandler: null,
    renderHandler: null,
    globalCompositeOperation: null
  };

  return function(ctx, imageSrcList, userOpts) {

    userOpts = userOpts || {};
    var opts = {};
    for (var k in defaultOpts) {
      opts[k] = (typeof userOpts[k] != 'undefined')?
          userOpts[k] : defaultOpts[k];
    }

    var anim_id = 0;

    var rect = 160, len, ox, oy;

    if (opts.shape === 'square') {
      len = Math.sin(Math.PI/4) * rect;
      ox = rect / 2;
      oy = rect / 2;
    } else {
      len = rect * Math.sqrt(3) / 2;
      ox = len / 2;
      oy = len / Math.sqrt(3) / 2;
    }
    

    var angle = 0;
    var deltaAngle = 0;
    var pressed = false;
    var holdAngle = 0;
    var content = null;

    preloadImages(imageSrcList, function(images) {
      init(images);
    } );

    var init = function(images) {

      content = createContent(rect, ox, oy, images, opts);

      var lastStamp = 0;
      var render = function(timeStamp) {
  
        var timeSpan = timeStamp - lastStamp;
        lastStamp = timeStamp;

        if (timeSpan > 1000) {
          // avoid runaway.
          timeSpan = 0;
        }

        var size = ks.getSize();
        updateSize(size.width, size.height);
        if (opts.shape === 'square') {
            updateSquareDisplay(size.width, size.height);
        } else {
            updateTriangleDisplay(size.width, size.height);
        }
  
        var dist = deltaAngle / (1000 / 60) * timeSpan;
        if (!pressed && dist !== 0) {
          angle += dist;
          //delta angle loss 0.99
          deltaAngle *= 0.99;
        }
        content.setDeltaAngle( dist );

        if (opts.renderHandler) {
          opts.renderHandler(timeStamp);
        }
        
        anim_id = requestAnimationFrame(render);
      };
      anim_id = requestAnimationFrame(render);

      if (opts.postInitHandler) {
        opts.postInitHandler();
      }
    };

    //use cx and cy as the origin, 
    // first map p to the new origin
    // then, get the angle of the mapped point p to X axis(Math.atan2)
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

    // square

    var updateSquareDisplay = function(w, h) {

      content.moveAll();

      // render
      ctx.clearRect(0, 0, w, h);

      if (opts.bgColor) {
        ctx.fillStyle = opts.bgColor;
        ctx.fillRect(0, 0, w, h);
      }
      var diag = Math.sqrt(h * h + w * w);
      var sqrs = Math.ceil(diag / len) + 1;
      ctx.save();
      //rotate screen
      if (opts.rotScreen) {
        ctx.translate( (w - diag) / 2, (h - diag) / 2);
        ctx.translate(diag / 2, diag / 2);
        ctx.rotate(angle);
        ctx.translate(-diag / 2, -diag / 2);
      } 

      for(var i = 0; i < sqrs; i++) {
        for(var j = 0; j < sqrs; j++) {
          drawSquareUnit(i * len, j * len, len, i, j);
        }
      }
      ctx.restore();
    };

    var drawSquareUnit = function(x, y, l, i, j) {

      ctx.save();

      var scale_x, scale_y, trans_x, trans_y;

      if (i % 2 === 0) {
        scale_x = 1;
        trans_x = x;
      } else {
        scale_x = -1;
        trans_x = x + l;
      }

      if (j % 2 === 0) {
        scale_y = 1;
        trans_y = y;
      } else {
        scale_y = -1;
        trans_y = y + l;
      }
      ctx.translate(trans_x, trans_y);
      ctx.scale(scale_x, scale_y);
      ctx.beginPath();
      ctx.rect(0, 0, l, l);
      ctx.clip();
      //
      // the upper left coner of clip area has
      // an offset against the outer rectangle.
      ctx.translate(-(rect - len ) / 2, -(rect - len ) / 2);
      //rotate to make outer rect counteract againt
      //the rotating scene.
      ctx.translate(ox, oy);
      if (opts.rotScreen) {
        ctx.rotate(-angle);
      }
      ctx.translate(-ox, -oy);

      ctx.drawImage(content.canvas, 0, 0);
      ctx.restore();

    };

    // triangle

    var updateTriangleDisplay = function(w, h) {

      content.moveAll();

      // center
      var cx = w / 2;
      var cy = h / 2;

      // misc
      var n = Math.ceil(Math.sqrt(w * w + h * h) / 2 / len) + 1;
      //replace variable angle with 0, to cease the canvas
      //from rotating.
      var mxx, mxy, myx, myy;
      if (opts.rotScreen) {
        mxx = Math.cos(angle) * len;
        mxy = Math.sin(angle) * len;
        myx = Math.cos(angle + Math.PI / 2) * len * Math.sqrt(3) / 2;
        myy = Math.sin(angle + Math.PI / 2) * len * Math.sqrt(3) / 2;
      } else {
        mxx = Math.cos(0) * len;
        mxy = Math.sin(0) * len;
        myx = Math.cos(0 + Math.PI / 2) * len * Math.sqrt(3) / 2;
        myy = Math.sin(0 + Math.PI / 2) * len * Math.sqrt(3) / 2;
      }

      // render
      ctx.clearRect(0, 0, w, h);

      if (opts.bgColor) {
        ctx.fillStyle = opts.bgColor;
        ctx.fillRect(0, 0, w, h);
      }

      for (var x = -n; x <= n; x += 1) {
        for (var y = -n; y <= n; y += 1) {
          var dx = x + ( (y % 2 !== 0)? 0.5 : 0);
          var dy = y;
          var tx = mxx * dx + myx * dy + cx;
          var ty = mxy * dx + myy * dy + cy;
          var rot = (absmod(x, 3) + absmod(y, 2) * 2) % 3;
          drawTriangleUnit(tx, ty, len, rot, false);
          drawTriangleUnit(tx, ty, len, rot, true);
        }
      }
    };

    var drawTriangleUnit = function(x, y, l, rot, inv) {

      ctx.save();

      ctx.translate(x, y);
      if (opts.rotScreen) {
        ctx.rotate(angle);
      }
      ctx.translate(-ox, -oy);

      if (inv) {
        ctx.transform(1, 0, 0, -1, 0, 0);
      }

      for (var i = 0; i < rot; i += 1) {
        ctx.rotate(-Math.PI / 3 * 2);
        ctx.translate(-l, 0);
      }

      // clip triangle
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(l, 0);
      ctx.lineTo(l / 2, l * Math.sqrt(3) / 2);
      ctx.closePath();
      ctx.clip();

      // adjust
      ctx.translate(ox, oy);
      if (opts.rotScreen) {
        ctx.rotate(-angle);
      }

      // content
      ctx.translate(-rect / 2, -rect / 2);
      ctx.drawImage(content.canvas, 0, 0);

      ctx.restore();
    };
 
    var ks = {
      getSize: function() {
        return {
          width: window.innerWidth,
          height: window.innerHeight
        };
      },
      destroy: function() {
        if (anim_id) {
          cancelAnimationFrame(anim_id);
        }
      }
    };
    return ks;
  };
}();
