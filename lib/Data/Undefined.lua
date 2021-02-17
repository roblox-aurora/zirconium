local self = newproxy(true)
getmetatable(self).__tostring = function()
    return "undefined"
end
return self;