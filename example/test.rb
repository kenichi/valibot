require 'dm-core'

class Foo
  include DataMapper::Resource
  property :id, Serial
  property :bar, String
  property :password, String
  property :email, String, :format => :email_address
  validates_presence_of :bar, :password, :email
  validates_length_of :bar, :min => 3, :max => 10 
  validates_with_block :password do
    if self.password =~ /[A-Z]/ && self.password =~ /[0-9]/
      true
    else
      [false, "Password must contain at least one UpperCase letter and 1 number."]
    end
  end
end

class Bar
  include DataMapper::Resource
  property :id, Serial
  property :password, String, :required => true
  validates_with_block :password do
    if self.password =~ /[^0-9]/
      true
    else
      [false, "must contain only numbers."]
    end
  end
end

class Bat
  include DataMapper::Resource
  property :id, Serial
  property :password, String
  validates_with_block :password, :context => :schnitzel do
    if self.password =~ /[^A-Z]/
      true
    else
      [false, "must contain only UpperCase letters."]
    end
  end
end
