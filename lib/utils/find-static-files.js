const fs = require('fs');
const VError = require('verror');

const findAllNonHiddenFiles = function (path, existingFiles, pathSuffix) {
  return (new Promise((resolve, reject) => {
    fs.readdir(path + (pathSuffix || ''), (err, files) => { err ? reject(err) : resolve(files); });
  }))
    .then(files =>
      files.filter(name => name.substr(0, 1) !== '.')
        .map(name => (pathSuffix ? pathSuffix + '/' : '') + name)
    )
    .then(files => Promise.all(files.map(name => new Promise((resolve, reject) => {
      fs.stat(path + name, (err, stats) => { err ? reject(err) : resolve({ name, stats }); });
    }))))
    .then(files => Promise.all(
        files.filter(file => file.stats.isDirectory())
          .map(dir => findAllNonHiddenFiles(path, existingFiles, dir.name))
      )
        .then(newFiles =>
          files.filter(file => file.stats.isFile())
            .map(file => file.name)
            .filter(file => !existingFiles[file])
            .concat(newFiles.reduce((flatNewFiles, part) => flatNewFiles.concat(part), []))
        )
    )
    .catch(err => Promise.reject(new VError(err, 'Error in listing all files')));
};

const findAllStaticFiles = function (theme, existingFiles) {
  existingFiles = existingFiles || {};

  return (theme.publicPath ? findAllNonHiddenFiles(theme.publicPath, existingFiles) : Promise.resolve([]))
    .then(files => files.reduce((allFiles, file) => {
      allFiles[file] = theme.publicPath + file;
      return allFiles;
    }, existingFiles))
    .then(files => theme.parent ? findAllStaticFiles(theme.parent, files) : files);
};

module.exports = findAllStaticFiles;
