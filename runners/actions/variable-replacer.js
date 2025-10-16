// runners/actions/variable-replacer.js

class VariableReplacer {
  replaceVariablesInParams(params, suite) {
    const replacedParams = {};
    for (const key in params) {
      if (Array.isArray(params[key])) {
        replacedParams[key] = params[key].map(v => 
          typeof v === 'string' ? this.replaceVariables(v, suite) : v
        );
      } else if (typeof params[key] === 'string') {
        replacedParams[key] = this.replaceVariables(params[key], suite);
      } else {
        replacedParams[key] = params[key];
      }
    }
    return replacedParams;
  }

  replaceVariables(value, suite) {
    if (typeof value !== 'string') return value;
    
    let result = value.replace('${baseUrl}', suite.baseUrl);
    
    const variables = suite.variables || {};
    for (const key in variables) {
      const val = variables[key];
      if (typeof val === 'object') {
        for (const subKey in val) {
          const placeholder = `${key}.${subKey}`;
          result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\\\]/g, '\\$&'), 'g'), val[subKey]);
        }
      } else {
        const placeholder = `${key}`;
        result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\\\]/g, '\\$&'), 'g'), val);
      }
    }
    
    return result;
  }
}

module.exports = { VariableReplacer };