local function isArray(value)
    if type(value) ~= "table" or getmetatable(value) then
        return false
    end

    local key = next(value)
    local hasIndex = typeof(key) == "number"
    local hasNoKey = #value > 0 and next(value, #value) == nil
    return hasIndex and hasNoKey
end

local function isMap(value)
    return type(value) == "table" and not getmetatable(value) and type(next(value)) == "string"
end

local function isAmbiguous(value)
    return type(value) == "table" and not isMap(value) and not isArray(value)
end



return {
    isArray = isArray,
    isMap = isMap,
    isAmbiguous = isAmbiguous,
}