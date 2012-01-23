# valibot.rb (c) 2011 kenichi nakamura (kenichi.nakamura@gmail.com)
# 
# easy automatic form field validation against datamapper models behind a sinatra app.
# this is the helper module and Sinatra app class.
# 
# see ____ for details.  TODO
 
module Valibot

  JAVASCRIPT = File.join File.dirname(__FILE__), '..', 'js', 'valibot.js'

  module Helpers

    def self.registered app; app.helpers Valibot::Helpers; end
    def valibot_js; File.read Valibot::JAVASCRIPT; end

  end

  class App < Sinatra::Base

    before do
      set_content_type
    end

    get '/valibot.js' do
      content_type :js
      cache_control :public, :max_age => 10 * 60
      File.read Valibot::JAVASCRIPT
    end

    post '/:model/:field/in/:context' do
      validate_field_value *parse(params)
    end

    post '/:model/in/:context' do
      validate_model *parse(params)
    end

    post '/:model/:field' do
      validate_field_value *parse(params)
    end

    post '/:model' do
      validate_model *parse(params)
    end

    get '/:model/:field/in/:context' do
      jsonp validate_field_value *parse(params)
    end

    get '/:model/in/:context' do
      jsonp validate_model *parse(params)
    end

    get '/:model/:field' do
      jsonp validate_field_value *parse(params)
    end

    get '/:model' do
      jsonp validate_model *parse(params)
    end

    private

    def parse params = {}
      model_class_name = params[:model].camel_case
      model_class = begin
                      Kernel.const_get(model_class_name)
                    rescue NameError => e
                      halt(Yajl.dump :error => e.message)
                    end
      field_sym = params[:field] ? params[:field].to_sym : nil
      context = params[:context] ? params[:context].to_sym : :default
      dependents = params[params[:model]]
      [model_class, field_sym, context, dependents].compact
    end
    
    def validate_field_value model = nil, field = nil, context = :default, dependents = {}
      if model && model.included_modules.include?(DataMapper::Resource)
        begin
          if model.properties.map(&:name).include?(field) or model.new.__send__(field).kind_of?(DataMapper::Collection)
            obj = model.new dependents.merge field => params['value']
            Yajl.dump :error => obj.errors[field] if !obj.valid?(context) && obj.errors.keys.include?(field)
          else
            Yajl.dump :error => "Invalid field: #{params[:field]}"
          end
        rescue NoMethodError => e
          Yajl.dump :error => "Invalid field: #{params[:field]}"
        end
      else
        Yajl.dump :error => "Invalid model: #{params[:model].camel_case}"
      end
    end

    def validate_model model = nil, context = :default
      if model && model.included_modules.include?(DataMapper::Resource)
        obj = model.new params[params[:model]]
        unless obj.valid?(context)
          Yajl.dump :error => obj.errors.to_hash
        end
      else
        Yajl.dump :error => "Invalid model: #{params[:model].camel_case}"
      end
    end

    def set_content_type
      content_type (params['callback'] ? :js : :json)
    end

    def jsonp json = ''
      return json unless params['callback']
      params['callback'] + "(#{json})"
    end

  end

end
