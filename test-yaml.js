const fs = require('fs');
const path = require('path');
const jsyaml = require("js-yaml");
var colors = require('colors');

const walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const validThemes = ['berry','blue','ceramic','green','orange','turquoise'];
let githubs = [];
const validateProfiles = (profiles) => profiles.map(l => {

    console.log(("Validating: "+l).yellow);
    const content = fs.readFileSync(l, 'utf8');
    const yaml = jsyaml.load(content);
    const fileName = l.replace(/^.*[\\\/]/, '').split('.').slice(0, -1).join('.').toLowerCase();

    if(typeof yaml == 'undefined') throw new Error(`The file ${fileName}.yml was impossible to parse`.red);
    if(!yaml.basic_info.github) throw new Error('Missing github username on YML file ${fileName}.yml'.red);

    if(yaml.template != 'online-cv') throw new Error(`The only supported template is online-cv`.red);

    if(typeof yaml.phone !== 'undefined') throw new Error(`Missing or invalid phone field`.red);

    if(!Array.isArray(yaml.projects.assignments)) throw new Error(`You are missing projects, add at least one assignment to the YML`.red);

    if(typeof yaml.skin == 'undefined') throw new Error(`You need to specify a skin on the ${fileName}.yml, the following options are available: ${validThemes.join(',')}`.red);
    if(!validThemes.includes(yaml.skin)) throw new Error(`Invalid skin value ${yaml.skin} on file ${fileName}.yml, the following options are available: ${validThemes.join(',')}`.red);

    if(fileName != yaml.basic_info.github.toLowerCase()) throw new Error(`The github username ${yaml.basic_info.github} inside the YML file does not match the file name: ${fileName}`.red);

    if(githubs.includes(yaml.basic_info.github)) throw new Error(`Duplicated github username: ${yaml.basic_info.github.red} in two or more files`);
    githubs.push(yaml.basic_info.github);

    return yaml;
});

async function status (workingDir) {
   const git = require('simple-git/promise');
   
   let statusSummary = null;
   console.log("Checking git status for non-YML files.".yellow);
   try {
      statusSummary = await git(workingDir).status();
   }
   catch (e) {
      console.error(e);
   }
   
   return statusSummary;
}

// using the async function
status(__dirname).then(status => {
    //const nonYMLFiles = status.files.filter(f => f.path.indexOf('.yml') == -1);
    const nonYMLFiles = [];
    if(nonYMLFiles.length > 0){
        console.log("You should only update your YML file and the following files have also been updated: ".red);
        console.log(nonYMLFiles.map(f => f.path))
        console.log("Use `$ git checkout <path/to/file>` to undo any changes you did to them".red);
        process.exit(1);
    }
    else{
        walk('src/students/', function(err, results) {
            if (err){
                console.log("Error scanning yaml files".red);
                process.exit(1);
            }

            try{
                const result = validateProfiles(results);
                console.log("Success!! All files are valid".green);
                process.exit(0);
            }
            catch(error){
                console.log("");
                console.log("");
                console.log("***** There is one error on your files!!! ****".red);
                console.log("Here are more details about your error (below):".red);
                console.log("");
                console.log(error);
                console.log("");
                process.exit(1);
            }
        });
    }
}).catch(err => {
    console.log(err);
    process.exit(1);
});
