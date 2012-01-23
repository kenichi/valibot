/* valibot.js (c) 2012 kenichi nakamura (kenichi.nakamura@gmail.com)
 *
 * javascript class for easy automatic form field validation against datamapper
 * models behind a sinatra app.
 *
 * see ____ for details.  TODO
 */

//  regex to make sure we only grab fields whose 'name' attrs match
var _valibotFieldRegExp = new RegExp('^\\w+\\[[^\\]]+\\]$');

if (Array.prototype.indexOf == null) {
  Array.prototype.indexOf = function(obj) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] == obj) {
        return i;
      }
    }
    return -1;
  };
}
Array.prototype.contains = function(obj){ return this.indexOf(obj) != -1; };

/* the Valibot class. create an object of this class and feed it a model name. oh,
 * and options too if you want. the object, during construction, will attach
 * Valitrons (see below) to each field it finds that matches the modelName specified.
 * it will also attach Confirmomats (see below) to any field specified as a
 * confirmation field.
 */
function Valibot(opts) {

  this.pathPrefix =          '_valibot';
  this.modelNames =          [];
  this.errorTagPlacer =      this._defaultErrorTagPlacer;
  this.errorTagBuilder =     this._defaultErrorTagBuilder;
  this.errorTagRemover =     this._defaultErrorTagRemover;
  this.errorTagTransformer = this._defaultErrorTagTransformer;
  this.include =             {};
  this.exclude =             {};
  this.bindEvents =          {};
  this.context =             null;
  this.confirm =             [];
  this.confirmomats =        [];
  this.valitrons =           [];
  this.valids =              [];
  this.invalids =            [];
  this.bindOnSubmit =        true;
  this.submitForm =          true;
  this.onSubmitCallback =    null;
  this.agreements =          [];
  this.agreepeeohs =         [];
  this.formId =              '';
  this.appUrl =              null;
  this.dependents =          {};
  this.radiomatons =         [];

  if (opts != null) {
    if (opts.fancy != null && opts.fancy) {
      this.errorTagPlacer =      this._fancyErrorTagPlacer;
      this.errorTagRemover =     this._fancyErrorTagRemover;
      this.errorTagTransformer = this._fancyErrorTagTransformer;
    }
    if (opts.modelName != null)             this.modelNames =          [opts.modelName];
    if (opts.modelNames != null)            this.modelNames =          opts.modelNames;
    if (opts.pathPrefix != null)            this.pathPrefix =          opts.pathPrefix;
    if (opts.errorTagPlacer != null)        this.errorTagPlacer =      opts.errorTagPlacer;
    if (opts.errorTagBuilder != null)       this.errorTagBuilder =     opts.errorTagBuilder;
    if (opts.errorTagRemover != null)       this.errorTagRemover =     opts.errorTagRemover;
    if (opts.errorTagTransformer != null)   this.errorTagTransformer = opts.errorTagTransformer;
    if (opts.bindEvents != null)            this.bindEvents =          opts.bindEvents;
    if (opts.context != null)               this.context =             opts.context;
    if (opts.confirm != null)               this.confirm =             opts.confirm;
    if (opts.bindOnSubmit != null)          this.bindOnSubmit =        opts.bindOnSubmit;
    if (opts.submitForm != null)            this.submitForm =          opts.submitForm;
    if (opts.onSubmitCallback != null)      this.onSubmitCallback =    opts.onSubmitCallback;
    if (opts.agreements != null)            this.agreements =          opts.agreements;
    if (opts.formId != null)                this.formId =              '#' + opts.formId + ' ';
    if (opts.appUrl != null)                this.appUrl =              opts.appUrl;
    if (opts.dependents != null)            this.dependents =          opts.dependents;

    if (opts.include != null) {
      if (opts.include instanceof Array) {
        this.include[this.modelNames[0]] = opts.include;
      } else {
        this.include = opts.include;
      }
    }
    if (opts.exclude != null) {
      if (opts.exclude instanceof Array) {
        this.exclude[this.modelNames[0]] = opts.exclude;
      } else {
        this.exclude = opts.exclude;
      }
    }
     
  }

  var _this = this;
  $(this.modelNames).each(function(i, modelName) {
    $(_this.formId + 'input[name^=' +    modelName + '], ' +
      _this.formId + 'select[name^=' +   modelName + '], ' +
      _this.formId + 'textarea[name^=' + modelName + ']').each(function(i,f) {

      var _name = $(f).attr('name');
      var field = _name.substring(_name.indexOf('[') + 1, _name.length - 1);

      var _type = f.type.toLowerCase();
      var _defaultBindEvent = 'blur';
      if (_type == 'checkbox' || _type == 'radio' || _type == 'select-one' || _type == 'select-multiple')
        _defaultBindEvent = 'change';

      var bindEvent = (_this.bindEvents[field] != null) ? _this.bindEvents[field] : _defaultBindEvent;

      if (_type == 'radio') {
        if (!_this.hasRadiomaton(field)) _this.radiomatons.push(new Radiomaton(modelName, field, _this));
      } else {
        if (_this.include[modelName] instanceof Array && _this.include[modelName].indexOf(field) != -1) {
          _this.valitrons.push(new Valitron(f, modelName, field, bindEvent, _this));
        } else if (_this.exclude[modelName] instanceof Array && _this.exclude[modelName].indexOf(field) != -1) {
          // NOOP
        } else {
          if (_valibotFieldRegExp.test(f.name))
            _this.valitrons.push(new Valitron(f, modelName, field, bindEvent, _this));
        }
      }

    });
  });

  if (this.confirm != null && this.confirm.length > 0) {
    $(this.confirm).each(function(i,c) {
      $.each(c, function(id, things) { _this.confirmomats.push(new Confirmomat(id, things, _this)); });
    });
  }

  if (this.agreements != null && this.agreements.length > 0) {
    $(this.agreements).each(function(i,c) {
      $.each(c, function(id, things) { _this.agreepeeohs.push(new AgreePeeOh(id, things, _this)); });
    });
  }

  this.form = this.minions()[0].tag.form;
  if (this.bindOnSubmit)
    $(this.form).submit(function(e){ e.preventDefault(); _this.onSubmit(); });

}

Valibot.prototype = {

  addValid:
    function(good) {
      if (!this.valids.contains(good))  this.valids.push(good);
      if (this.invalids.contains(good)) this.invalids.splice(this.invalids.indexOf(good), 1);
    },

  removeValid:
    function(remove) {
      if (this.valids.contains(remove)) this.valids.splice(this.valids.indexOf(remove), 1);
    },

  addInvalid:
    function(bad) {
      if (!this.invalids.contains(bad)) this.invalids.push(bad);
      this.removeValid(bad);
    },

  unchecked:
    function() {
      var uc = [];
      var _this = this;
      $(this.valitrons).each(function(i,tron){ if (!_this.valids.contains(tron) && !_this.invalids.contains(tron)) uc.push(tron); });
      $(this.confirmomats).each(function(i,mat){ if (!_this.valids.contains(mat) && !_this.invalids.contains(mat)) uc.push(mat); });
      $(this.agreepeeohs).each(function(i,oh){ if (!_this.valids.contains(oh) && !_this.invalids.contains(oh)) uc.push(oh); });
      $(this.radiomatons).each(function(i,rad){ if (!_this.valids.contains(rad) && !_this.invalids.contains(rad)) uc.push(rad); });
      return uc;
    },

  allValid:
    function() {
      return this.invalids.length == 0 &&
        this.valids.length == this.valitrons.length + this.confirmomats.length + this.agreepeeohs.length + this.radiomatons.length;
    },

  onSubmit:
    function() {
      if (!this.allValid()) {
        this.checking = this.invalids.concat(this.unchecked());
        var _this = this;
        $(this.invalids).each(function(i, bad){ bad.checkValue(null, function(valid) { _this.onSubmitCheckCallback(bad); }); });
        $(this.unchecked()).each(function(i, uc){ uc.checkValue(null, function(valid) { _this.onSubmitCheckCallback(uc); }); });
      } else {
        if (this.submitForm) {
          this.form.submit();
        } else if (typeof this.onSubmitCallback === 'function') {
          this.onSubmitCallback(this);
        }
      }
    },

  onSubmitCheckCallback:
    function(tronOrMat, valid) {
      this.checking.splice(this.checking.indexOf(tronOrMat), 1);
      if (this.checking.length == 0) {
        if (!this.allValid()) {
          this.invalids[0].tag.focus();
        } else {
          if (this.submitForm) {
            this.form.submit();
          } else if (typeof this.onSubmitCallback === 'function') {
            this.onSubmitCallback(this);
          }
        }
      }
    },

  // never called by Valibot or its minions, but left here for utility.
  all:
    function(callback) {
      var params = {};
      $(this.valitrons).each(function(i, tron){ params[tron.tag.name] = tron.tag.value; });
      var path = (this.appUrl != null ? this.appUrl : '') +
                 '/' + this.pathPrefix +
                 '/' + this.modelName +
                 (this.context != null ? ('/in/' + this.context) : '');
      if (this.context != null)
        path = path + '/in/' + this.context;
      $.post(path, params, function(res){ callback(res) },
             this.valibot.appUrl != null ? 'jsonp' : 'json');
    },

  hasRadiomaton:
    function(field) {
      var has = false;
      $(this.radiomatons).each(function(i, r){ if (r.field == field){ has = true; }});
      return has;
    },

  minions:
    function() {
      return this.valitrons.concat(this.confirmomats)
                           .concat(this.agreepeeohs)
                           .concat(this.radiomatons);
    },

  die:
    function() {
      $(this.minions()).each(function(i,minion) {
        minion.die();
      });
    },

  _defaultErrorTagPlacer:
    function(tag, errorTag, self, minion) {
      $(errorTag).insertAfter($(tag));
    },

  _defaultErrorTagBuilder:
    function(text, self, minion) {
      var em = document.createElement('em');
      em.className = 'error';
      em.innerHTML = text;
      return em;
    },

  _defaultErrorTagRemover:
    function(errorTag, self, callback, minion) {
      var ret = $(errorTag).remove();
      if (callback != null) callback(ret);
    },

  _defaultErrorTagTransformer:
    function(text, errorTag, self, minion) {
      var em = this.errorTagBuilder(text, self, minion);
      $(errorTag).replaceWith(em);
      return em;
    },

  _fancyErrorTagPlacer:
    function(tag, errorTag, self, minion) {
      $(errorTag).css('display', 'none');
      $(errorTag).insertAfter($(tag));
      $(errorTag).fadeIn();
    },

  _fancyErrorTagRemover:
    function(errorTag, self, minion) {
      $(errorTag).fadeOut(null, null, function(){ $(errorTag).remove(); });
    },

  _fancyErrorTagTransformer:
    function(text, errorTag, self, minion) {
      if (text == errorTag.innerHTML) {
        return errorTag;
      } else {
        var newErrorTag = self.errorTagBuilder(text, self, minion);
        $(errorTag).fadeOut(null, null, function() {
          var tag = $(errorTag).prev();
          $(errorTag).remove();
          self.errorTagPlacer(tag, newErrorTag);
        });
        return newErrorTag;
      }
    }

};

// ---

/* the Valitron class. instantiated on each model form field by an overseeing
 * Valibot. handles the actual XHR between the JS and the valibot sinatra app.
 */
function Valitron(tag, model, field, bindEvent, valibot) {
  this.valid = false;
  this.tag = tag;
  this.model = model;
  this.field = field;
  this.valibot = valibot;
  this.errorTag = null;
  this.bindEvent = bindEvent;
  var _this = this;
  $(this.tag).bind(this.bindEvent, function(event){ _this.checkValue(event); });
  $(this.tag).bind('keyup', function(event){ _this.reset(); });
}

Valitron.prototype = {

  checkValue:
    function(event, callback) {
      var _this = this;
      var path = (this.valibot.appUrl != null ? this.valibot.appUrl : '') +
                 '/' + this.valibot.pathPrefix +
                 '/' + this.model +
                 '/' + this.field +
                 (this.valibot.context != null ? ('/in/' + this.valibot.context) : '');
      var val = this.tag.value;
      if (this.tag.type.toLowerCase() == 'checkbox') val = this.tag.checked;
      var params = {value: val};
      if (this.valibot.dependents[this.field]) {
        $(this.valibot.dependents[this.field]).each(function(i,dep) {
          params[_this.model + '[' + dep + ']'] =
            $('input[name="' + _this.model + '[' + dep + ']"], ' +
              'select[name="' + _this.model + '[' + dep + ']"], ' +
              'textarea[name="' + _this.model + '[' + dep + ']"]').val();
        });
      }
      $.post(path, params, function(res){ _this.handleResponse(res, callback); },
             this.valibot.appUrl != null ? 'jsonp' : 'json');
    },

  handleResponse:
    function(res, callback) {

      // bad state -> good state
      if (res == null && this.errorTag != null) {
        var _this = this;
        this.valibot.errorTagRemover(this.errorTag, this.valibot, function(ret){ _this.errorTag = null; }, this);
        this.valibot.addValid(this);
        if (callback != null) callback(true);
        this.valid = true;

      // null state -> good state
      } else if (res == null && this.errorTag == null) {
        this.valibot.addValid(this);
        if (callback != null) callback(true);
        this.valid = true;

      // bad state -> bad state
      } else if (res != null && res.error != null && this.errorTag != null) {
        this.errorTag = this.valibot.errorTagTransformer(this.parseErrorStrings(res.error), this.errorTag, this.valibot, this);
        this.valibot.addInvalid(this);
        if (callback != null) callback(false);
        this.valid = false;

      // null state -> bad state
      } else if (res != null && res.error != null && this.errorTag == null) {
        this.errorTag = this.valibot.errorTagBuilder(this.parseErrorStrings(res.error), this.valibot, this);
        this.valibot.errorTagPlacer(this.tag, this.errorTag, this.valibot, this);
        this.valibot.addInvalid(this);
        if (callback != null) callback(false);
        this.valid = false;
      }
    },

  parseErrorStrings:
    function(error) {
      var es = '';
      $(error).each(function(i, e) { es += e + '<br/>' });
      return es.substring(0, es.length - 5); // remove last <br/>
    },

  reset:
    function() {
      this.valibot.removeValid(this);
      this.valid = false;
    },

  die:
    function() {
      $(this.tag).unbind(this.bindEvent);
      $(this.tag).unbind('keyup');
    }

};

// ---

/* the Confirm-o-mat class. instantiated on form fields that are specified as
 * needing to match another field by an overseeing Valibot. handles the test
 * for equal values between fields.
 */
function Confirmomat(id, things, valibot) {
  if ($('#' + id).length == 1 && $('#confirm_' + id).length == 1) {
    this.valid = false;
    this.tag = $('#confirm_' + id)[0];
    this.id = id;
    this.things = things;
    this.valibot = valibot;
    this.errorTag = null;
    var _this = this;
    $(this.tag).bind('blur', function(event){ _this.checkValue(event); });
    $(this.tag).bind('keyup', function(event){ _this.reset(); });
    $('#' + this.id).bind('keyup', function(event){ _this.reset(); });
  } else {
    // console.log('ERROR: matching fields not found or too many found.');
    return null;
  }
}

Confirmomat.prototype = {

  checkValue:
    function(event, callback) {
      if ($('#' + this.id).val() == $(this.tag).val()) {

        // bad state -> good state
        if (this.errorTag != null) {
          var _this = this;
          this.valibot.errorTagRemover(this.errorTag, this.valibot, function(ret){ _this.errorTag = null; }, this);
        }

        // * state -> good state
        this.valibot.addValid(this);
        if (callback != null) callback(true);
        this.valid = true;

      } else {

        // bad state -> bad state
        if (this.errorTag != null) {
          this.errorTag = this.valibot.errorTagTransformer(this.things + " do not match.", this.errorTag, this.valibot, this);

        // null state -> bad state
        } else {
          this.errorTag = this.valibot.errorTagBuilder(this.things + " do not match.", this.valibot, this);
          this.valibot.errorTagPlacer(this.tag, this.errorTag, this.valibot, this);
        }

        // * state -> bad state
        this.valibot.addInvalid(this);
        if (callback != null) callback(false);
        this.valid = false;

      }
    },

  reset:
    function() {
      // console.log('confirmomat resetting.');
      this.valibot.removeValid(this);
      this.valid = false;
    },

  die:
    function() {
      $(this.tag).unbind('blur');
      $(this.tag).unbind('keyup');
      $('#' + this.id).unbind('keyup');
    }

};

// ---

/* the AgreePeeOh class. instantiated on checkboxes that are specified as
 * needing to be checked for form submission to be allowed.
 */
function AgreePeeOh(id, things, valibot) {
  if ($('#' + id).length == 1) {
    this.valid = false;
    this.id = id;
    this.tag = $('#' + id)[0];
    this.things = things;
    this.valibot = valibot;
    this.errorTag = null;
    var _this = this;
    $(this.tag).bind('change', function(event){ _this.checkValue(event); });
  } else {
    return null;
  }
}

AgreePeeOh.prototype = {

  checkValue:
    function(event, callback) {
      if ($('#' + this.id).attr('checked')) {

        // bad state -> good state
        if (this.errorTag != null) {
          var _this = this;
          this.valibot.errorTagRemover(this.errorTag, this.valibot, function(ret){ _this.errorTag = null; }, this);
        }

        // * state -> good state
        this.valibot.addValid(this);
        if (callback != null) callback(true);
        this.valid = true;

      } else {

        // bad state -> bad state
        if (this.errorTag != null) {
          this.errorTag = this.valibot.errorTagTransformer("You must agree to the " + this.things + ".", this.errorTag, this.valibot, this);

        // null state -> bad state
        } else {
          this.errorTag = this.valibot.errorTagBuilder("You must agree to the " + this.things + ".", this.valibot, this);
          this.valibot.errorTagPlacer(this.tag, this.errorTag, this.valibot, this);
        }

        // * state -> bad state
        this.valibot.addInvalid(this);
        if (callback != null) callback(false);
        this.valid = false;

      }
    },

  reset:
    function() {
      this.valibot.removeValid(this);
      this.valid = false;
    },

  die:
    function() {
      $(this.tag).unbind('change');
    }

};

// ---

/* the Radiomaton class. instantiated on a set of radio buttons by an overseeing
 * Valibot. handles the actual XHR between the JS and the valibot sinatra app.
 */
function Radiomaton(model, field, valibot) {
  this.valid = false;
  this.model = model;
  this.field = field;
  this.valibot = valibot;
  this.errorTag = null;
  this.selector = this.valibot.formId + 'input[name="' + this.model + '[' + this.field + ']"]';
  this.radioInputs = $(this.selector);
  this.tag = this.radioInputs[this.radioInputs.length - 1]; // default to the last one
  var _this = this;
  $(this.radioInputs).each(function(i,r){ $(r).change(function(event){ _this.checkValue(event); }); });
}

Radiomaton.prototype = {

  checkValue:
    function(event, callback) {
      var _this = this;
      var path = (this.valibot.appUrl != null ? this.valibot.appUrl : '') +
                 '/' + this.valibot.pathPrefix +
                 '/' + this.model +
                 '/' + this.field +
                 (this.valibot.context != null ? ('/in/' + this.valibot.context) : '');
      var val = $(this.selector + ':checked').val() || '';
      var params = {value: val};
      if (this.valibot.dependents[this.field]) {
        $(this.valibot.dependents[this.field]).each(function(i,dep) {
          params[_this.model + '[' + dep + ']'] =
            $('input[name="' + _this.model + '[' + dep + ']"], ' +
              'select[name="' + _this.model + '[' + dep + ']"], ' +
              'textarea[name="' + _this.model + '[' + dep + ']"]').val();
        });
      }
      $.post(path, params, function(res){ _this.handleResponse(res, callback); },
             this.valibot.appUrl != null ? 'jsonp' : 'json');
    },

  handleResponse:
    function(res, callback) {

      // bad state -> good state
      if (res == null && this.errorTag != null) {
        var _this = this;
        this.valibot.errorTagRemover(this.errorTag, this.valibot, function(ret){ _this.errorTag = null; }, this);
        this.valibot.addValid(this);
        if (callback != null) callback(true);
        this.valid = true;

      // null state -> good state
      } else if (res == null && this.errorTag == null) {
        this.valibot.addValid(this);
        if (callback != null) callback(true);
        this.valid = true;

      // bad state -> bad state
      } else if (res != null && res.error != null && this.errorTag != null) {
        this.errorTag = this.valibot.errorTagTransformer(this.parseErrorStrings(res.error), this.errorTag, this.valibot, this);
        this.valibot.addInvalid(this);
        if (callback != null) callback(false);
        this.valid = false;

      // null state -> bad state
      } else if (res != null && res.error != null && this.errorTag == null) {
        this.errorTag = this.valibot.errorTagBuilder(this.parseErrorStrings(res.error), this.valibot, this);
        this.valibot.errorTagPlacer(this.tag, this.errorTag, this.valibot, this);
        this.valibot.addInvalid(this);
        if (callback != null) callback(false);
        this.valid = false;
      }
    },

  parseErrorStrings:
    function(error) {
      var es = '';
      $(error).each(function(i, e) { es += e + '<br/>' });
      return es.substring(0, es.length - 5); // remove last <br/>
    },

  reset:
    function() {
      this.valibot.removeValid(this);
      this.valid = false;
    },

  die:
    function() {
      $(this.radioInputs).each(function(i,r){ $(r).unbind('change'); });
    }

};

