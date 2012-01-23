Gem::Specification.new do |s|
  s.name        = "valibot"
  s.version     = "0.2.8"
  s.authors     = ['Kenichi Nakamura']
  s.email       = ["kenichi.nakamura@gmail.com"]
  s.homepage    = "https://github.com/kenichi/valibot"
  s.summary     = "Automatic field validation for forms backed by  DataMapper models through Sinatra."

  s.files        = Dir["{lib,js}/**/*"] + Dir["[A-Z]*"]

  s.rubyforge_project = s.name
  s.required_rubygems_version = ">= 1.3.4"

  s.add_dependency 'dm-core', '>= 1.0.0'
  s.add_dependency 'dm-validations', '>= 1.0.0'
  s.add_dependency 'sinatra', '>= 1.1.0'
end
