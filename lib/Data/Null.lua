local self = newproxy(true)
getmetatable(self).__tostring = function()
    return "(null)"
end
return self;