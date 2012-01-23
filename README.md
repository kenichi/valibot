Valibot!
========

Automatic field validation for forms backed by DataMapper models through Sinatra.

What it requires:
-----------------

* [Datamapper](http://datamapper.org/)
* [Sinatra](http://sinatrarb.com/)
* [Rack](http://rack.rubyforge.org/)
* [jQuery](http://jquery.com/)

What it provides:
-----------------

* full automatic field validation on default bind events
* field value matching confirmation
* extensible through callbacks used to build, place, remove, or transform error tags
* Valibot#all method to do the whole thing at once.
* automatic 'onsubmit' binding

To use (brief):
-------

* add this gem to your Gemfile, bundle install
* add the javascript to your site
* add the app to your config.ru (defaults to '/_valibot')
* create Valibots for the models on forms where you need them

To use (details):
-----------------

####to add the javascript to your site, there are two methods:

Valibot has a route at '/valibot.js' that will deliver the source. This is the *preferred* method:

    <script src="/_valibot/valibot.js"></script>

Valibot *can* add a helper to Sinatra::Base called 'valibot_js'. call this in a script template like so:

    <%= valibot_js %>

They deliver the exact same content, but the route adds Cache-Control headers so layers like Varnish or Rack::Cache can do their work. In order to use the helper, you need to register it in your app:

    class App < Sinatra::Base
      register Valibot::Helpers
      get('/'){ erb "<script><%= valibot_js %></script>" }
    end

####the sinatra app needs a place to run at in your Rack config. something like the following should suffice:

    map '/_valibot' do
      run Valibot::App
    end

note that you can change the path it runs at, but you must pass that path as a value to the Valibot javascript constructor using the key `pathPrefix` (see below).

####to create the Valibots, call the constructor inside $(document).ready():

    $(document).ready(function(){ new Valibot({ modelName: 'user' }); });

Constructor options:
--------------------

####modelName : string *required if no `modelNames`*
name of the model to validate against, in snake_case. in modern Rack-based webapps, the convention for form field names is to follow a `model_name[field_name]` pattern. Rack translates these names into the params hash and it is very common for the controller to pass this hash to a model constructor like `ModelName.new params['model_name']`.  your form should follow this convention for Valibot to work, as it will use jQuery to select all `input`, `textarea`, and `select` tags from the DOM that have names that start with this value. ex:

    <input type="text" name="user[first_name]"/>
    <input type="text" name="user[email]"/>
    ...
    new Valibot({ modelName: 'user' });

---

####modelNames : array of strings *required if no `modelName`*
names of the models to validate against, in snake_case. this behaves exactly like `modelName` but allows multiple models to be validated in the same form.  ex:

    <input type="text" name="user[first_name]"/>
    <input type="text" name="profile[bio]"/>
    ...
    new Valibot({ modelNames: ['user', 'profile'] });

note that the first invalid field of the _first model specified_ will be `focus()`ed if the form fails validation on submit.

---

####pathPrefix : string
path you have Valibot racked up at. ex:

    new Valibot({ modelName: 'user', pathPrefix: 'dogs_and_cats' });

---

####errorTagBuilder : function(text, self, minion)
a callback for building the tag you want to put in the DOM and show the user with the error message from DataMapper in it. the default builder will create an `<em>` element, set its class to 'error', innerHTML `text` in, and return it.
######parameters:
* `text` - error message from DataMapper
* `self` - reference to the Valibot object
* `minion` - reference to the Valitron or Confirm-o-mat object
######returns:
* an element with the `text` in it suitable for placing in to the DOM.

---

####errorTagPlacer : function(tag, errorTag, self, minion)
a callback for placing the element returned from the builder into the DOM.
######parameters:
* `tag` - the field element whose value is being validated
* `errorTag` - the element built and returned by the `errorTagBuilder` function of this Valibot
* `self` - reference to the Valibot object
* `minion` - reference to the Valitron or Confirm-o-mat object

---

####errorTagRemover : function(errorTag, self, minion)
a callback for removing the element from the DOM in the event of no error found.
######parameters:
* `errorTag` - the element in the DOM that holds the error message for this field
* `self` - reference to the Valibot object
* `minion` - reference to the Valitron or Confirm-o-mat object

---

####errorTagTransformer : function(text, errorTag, self, minion)
a callback for transforming the element in the DOM in the event of a new error message replacing an old one.
######parameters:
* `text` - error message from DataMapper
* `errorTag` - the element in the DOM that holds the error message for this field
* `self` - reference to the Valibot object
* `minion` - reference to the Valitron or Confirm-o-mat object

---

####include : array or map { modelName : array }
by default, Valibot will attach Valitrons to elements whose name attribute matches a specific regular expression, after jQuery selection. you can force fields whose name attributes don't match the regex to be checked by Valibot by putting the field name in this array. i'm not actually sure when this would be needed. :)

---

####exclude : array or map { modelName : array }
you can keep Valibot from attaching Valitrons to certain elements by putting their field names in this
array. ex:

    new Valibot({ modelName: 'user', exclude: ['middle_name'] });
    
    new Valibot({ modelNames: ['user', 'profile'], exclude: {'user': ['middle_name'], 'profile': ['icon']});

---

####bindEvents : map { fieldName : event }
Valibot has a fairly intuitive default bind event for each input type: `change` for checkboxes, radio buttons, and select drop-downs; `blur` for everything else. you can override these defaults on a per-field basis by passing them in this hash. ex:

    new Valibot({ modelName: 'user', bindEvents: {'middle_name':'keyup'} });

---

####context : string
DataMapper has contextual validations built-in. if you need to validate against a certain context, pass it in here.  ex:

    new Valibot({ modelName: 'user', context: 'signup' });

---

####confirm : array of maps { id : things }
often on a form, one will have an 'extra' field that is not part of the data model, but needs to match another field in value. usually, these are passwords or email addresses. in this case, if you have given the actual model field element an id of 'password', the confirmation field id should be 'confirm_password'. then you can tell Valibot about this by passing this array of hashes and it will attach a Confirm-o-mat to each. `things` is the word that the Confirm-o-mat will use in its error message about the things not matching. ex:

    new Valibot({ modelName: 'user', confirm: [{'password', 'Passwords'}] });

this would attach a Confirm-o-mat to `$('#confirm_password')` that checks its value against `$('#password').val()` and will build an errorTag with the text, "Passwords do not match."

---

####agreements : array of maps { id : things }
often on a form, one will have a checkbox that is not part of the data model, but needs to checked as a legally binding agreement. usually, these are rules or term and conditions, etc. in this case, simply give the input a unique id. then you can tell Valibot about it by passing this array of hashes and it will attach an Agree-Pee-Oh to each. `things` is the word that the Agree-Pee-Oh will use in its error message about the things not being agreed to. ex:

    new Valibot({ modelName: 'user', agreements: [{'rules': 'Rules'}] });

this would attach an Agree-Pee-Oh to `$('#rules')` that verified it's checked and will build an errorTag with the text, "You must agree to the Rules." if it is not.

---

####fancy : boolean
Valibot has two built-in types of errorTag(Placer|Remover|Transformer) functions. the default is very bland and simply inserts, replaces, or removes the errorTag element. the fancy option uses jQuery animation to fadeIn and fadeOut the errorTag element. if this is `true`, and you also feed it your own errorTag callbacks, those will be used instead. ex:

    new Valibot({ modelName: 'user', fancy: true, errorTagPlacer: myETPlacer });

this would utilize the "fancy" Remover and Transformer built-in functions, but call `myETPlacer()` for placement.  note that the `_fancyErrorTagTransformer` function actually calls whatever Placer function is set in the containing Valibot; in this case, `myETPlacer`.

---

####bindOnSubmit : boolean
Valibot automatically binds it's own `onSubmit()` function to the first form that it finds model fields in. this function will run through any unchecked or invalid 'trons or 'mats and call their `checkValue()` functions. once that is complete, if all of them are valid, it submits the form; otherwise, error messages are built/placed like normal, and the first invalid field is focus()ed. this flag allows you to turn off this functionality, for cases where you need to do your own onsubmit dance. note that the Valibot's onsubmit can be called in this situation anyway; but, be careful because it will submit the form if everything is valid. ex:

    var valibot = new Valibot({ modelName: 'user', bindOnSubmit: false });
    $(valibot.form).bind('submit', function(event) {
      event.preventDefault();

      // do something clever

      valibot.onSubmit();
    });

---

####submitForm : boolean
sometimes, you just want to submit the form yourself.  most of the time, you want to do it all AJAX fancypants.  fine, just pass this in as `false` and Valibot won't try to submit the form.  it will still call `onSubmitCallback` so you probably want to put your XHRs in there.

---

####onSubmitCallback : function(valibot)
set this to a function you want to run when the form would be submitted.  if you set `submitForm` to false, this function will be called, but the form WILL NOT be submitted.  use these two together to get Valibot validation on forms you want to submit XHR-style. ex:

    var valibot = new Valibot({ modelName: 'foo', submitForm: false, onSubmitCallback: function(valibot) {
      $.post(valibot.form.action, $(valibot.form).serialize(), function(response){ /* ... /* });
    }});

---

####appUrl : string
perhaps you want to run Valibot at a different URL completely from the one that the form your validating loaded from.  fine, just tell Valibot about it with this.  note that this puts Valibot into JSONP mode and all validation requests turn from POSTs into GETs. ex:

    new Valibot({ modelName: 'user', appUrl: 'http://some.other.domain/'});

this would cause all validation requests to go to 'http://some.other.domain/_valibot/:model/...'

---

####dependents : map of arrays { field : [ otherField, ... ] }
sometimes you need to validate a field based off of the value of another field.  you can tell Valibot about this with this option, and it will automatically include the value(s) of the other field(s) in the validation. ex:

    new Valibot({ modelName: 'user', dependents: {'last_name': ['first_name']} });

this would cause Valibot to POST the value of the field named 'user[first_name]' with the check request for 'last_name'. your model should be configured to validate `last_name` based off of the value of `first_name`:

    validates_with_block :last_name do
      if self.first_name == 'a' and self.last_name == 'b'
        [false, "can't have b with a."]
      else
        true
      end
    end

note that in the above example, `first_name` would still be validated on it's own.

Next Steps (TODOS):
-------------------

* automated testing (!!)
* array parameters
* profit!
