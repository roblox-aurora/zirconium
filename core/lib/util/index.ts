function startsWith(value: string, compareTo: string) {
	return value.sub(0, compareTo.size() - 1) === compareTo;
}

function startsWithIgnoreCase(value: string, compareTo: string) {
	return value.sub(0, compareTo.size() - 1).lower() === compareTo.lower();
}

export = { startsWith, startsWithIgnoreCase };
