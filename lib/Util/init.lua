local function isArray(value)
    if type(value) ~= "table" or getmetatable(value) then
        return false
    end

    local hasIndex = type(next(value)) == "number"
    local hasNoKey = next(value, #value) == nil
    return (hasIndex and hasNoKey) or #value == 0
end

return {
    isArray = isArray
}