require 'rubygems'
require 'sinatra/base'
require 'rack/commonlogger'
require 'dm-core'
require 'dm-migrations'
require 'dm-validations'
require 'do_sqlite3'
require 'extlib' unless String.instance_methods.include? 'camel_case'
require 'yajl'
require './test'
require File.join '..', 'lib', 'valibot'

DataMapper.setup :default, 'sqlite:///tmp/test'
DataMapper.auto_migrate!
Sinatra::Base.use Rack::CommonLogger

map '/_valibot' do
  run Valibot::App
end

map '/some/other/prefix' do
  run Valibot::App
end
