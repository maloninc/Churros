/* ***** BEGIN LICENSE BLOCK *****
 *
 * Copyright (c) 2011 Malon, Inc. <hiroyuki@maloninc.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * ***** END LICENSE BLOCK ***** */
var Churros = {};

/**
 * Churros.AppCache
 **/
Churros.AppCache= {
    timeId: null,
    startObserve: function(interval){
        applicationCache.addEventListener('updateready', function(){
            if(confirm('Software update is available. Update now?')){
                applicationCache.swapCache();
                location.reload();
                alert('Finish update!');
            }
        }, false);
        this.timeId = setInterval(function(){applicationCache.update();}, interval);
    },
    endObserve: function(){
        clearInterval(this.timeId);
    }
}

/**
 * Churros.LineStatus
 **/
Churros.LineStatus = {
    online: true,
    timeId: null,
    check: function() {
        var checkOnLine = function(res) {
            var oldStatus = Churros.LineStatus.online;
            if(res.status != 0) {
                Churros.LineStatus.online = true;
            } else {
                Churros.LineStatus.online = false;;
            }
            if(Churros.LineStatus.online != oldStatus) {
                if(Churros.LineStatus.online){
                   alert('Now ONLINE mode');
                   location.reload();
                }else{
                   alert('Now OFFLINE mode');
                }
            }
        };

          new ActiveSupport.Request('/online',{
            method: 'get',
            onSuccess: checkOnLine,
            onFailure: checkOnLine
          });
    },
    startObserve: function(interval) {
        this.check();
        this.timeId = setInterval(this.check, interval);
    },
    endObserve: function() {
        clearInterval(this.timeId);
    }
}


/**
 * Churros.WebDB
 **/
Churros.WebDB = {
    db: null,

    successHandler: function(tx, result) {
        //alert(result.insertId);
    },

    errorHandler: function(tx, error) {
        alert('SQL ERROR: ' + error.message);
    },

    open: function(db_name, version, comment, size) {
        if(window.openDatabase) {
            this.db = openDatabase(db_name, version, comment, size);
        }else {
            throw new Error('openDatabse is not supported.');
        }
    },

	findAll: function(model, success, error){
        if(!this.db) {
            throw new Error('The database is not open');
        }
        if(!success) success = Churros.WebDB.successHandler;
        if(!error) error = Churros.WebDB.errorHandler;

		var table_name = model.tableName;
        var data = {};
        this.db.transaction(function(tx) {
            var stmt = 'SELECT * FROM ' + table_name + " WHERE delete_flag is null OR delete_flag = 'false'";
            
            tx.executeSql(stmt, [],
                function(tx, res){
                    for(i = 0; i < res.rows.length; i++){
                        var item = res.rows.item(i);
                        for(var key in model.fields) {
                            if (data[item.id] == undefined ) data[item.id] = {};
                            data[item.id][key] = item[key];
                        }
                    }
                    success(data);
                }, error);
        });
    },

    create: function(table_name, fields, success, error){
        if(!this.db) {
            throw new Error('The database is not open');
        }
        if(!success) success = Churros.WebDB.successHandler;
        if(!error) error = Churros.WebDB.errorHandler;

        var field_def = new Array();
        for(var field_name in fields) {
            var type  = fields[field_name].type;
            field_def.push('"' + field_name + '" ' + type);
        }
        this.db.transaction(function(tx) {
            var stmt = 'CREATE TABLE IF NOT EXISTS ' + 
                       table_name + '("id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, ' + 
                       field_def.join(',') +
                       ', "new_flag" boolean, "dirty_flag" boolean, "delete_flag" boolean, "updated_at" datetime, "created_at" datetime);';
            tx.executeSql(stmt, [], success, error);
        });
    },

    insert: function(table_name, data, new_flag, success, error){
        if(!this.db) {
            throw new Error('The database is not open');
        }
        if(!success) success = Churros.WebDB.successHandler;
        if(!error) error = Churros.WebDB.errorHandler;
		if(data.id != undefined) { // just refresh new_flag when it includes id.
            this.db.transaction(function(tx) {
                var stmt = 'UPDATE ' + 
                           table_name + 
                           " SET new_flag = 'false'" +
                           ' WHERE id = ?'; 
                tx.executeSql(stmt, [data.id], success, error); 
            });
            return;
        }

        var fields = new Array();
        var values = new Array();
        var place_holders= new Array();
        for(var key in data) {
            fields.push('"' + key + '"');
            values.push(data[key]);
            place_holders.push('?');
        }
        values.push(new_flag);
        this.db.transaction(function(tx) {
            var stmt = 'INSERT INTO ' + 
                       table_name + 
                       ' (' + fields.join(',') + ',"created_at", "updated_at", "new_flag")' +
                       ' VALUES(' + place_holders.join(',') + ", datetime('now'), datetime('now'), ?)";
            
            tx.executeSql(stmt, values, success, error); 
        });
    },

    sync: function(model, json_data, callback){ // insert data if it is newer than data in DB.
        if(!this.db) {
            throw new Error('The database is not open');
        }
        var success = Churros.WebDB.successHandler;
        var error = Churros.WebDB.errorHandler;
        var table_name = model.tableName;
        this.db.transaction(function(tx) {
            for(var id in json_data) (function(id){
              var data = json_data[id];
              data.id = id;
              var stmt = 'SELECT * FROM ' + 
                         table_name + 
                         ' WHERE id = ?'; 
              tx.executeSql(stmt, [id], 
                function(tx, res){
                 // update data when it found
                 if(res.rows.length > 0) { 
                     var local_data = res.rows.item(0);
                     var remote_data = data;
                     var local_updated_at = Date.parse(local_data.updated_at.replace(/-/g,'/'));
                     var remote_updated_at = Date.parse(remote_data.updated_at.replace(/-/g,'/'));
                     if(local_updated_at < remote_updated_at){
                       var updates = new Array();
                       var values = new Array();
                       for(var key in data) {
                           if(key != 'id' && key != 'updated_at' && key != 'created_at'){ 
                               updates.push('"' + key + '" = ?');
                               values.push(data[key]);
                           }
                       }
                       values.push('false');
                       values.push(id);
                       var stmt = 'UPDATE ' + 
                                  table_name + 
                                  ' SET ' +
                                  updates.join(',') +
                                  ", updated_at = datetime('now'), dirty_flag = ?" +
                                  ' WHERE id = ?';
                       tx.executeSql(stmt, values, success, error); 
                     }
                 // insert data when not found
                 }else{
                       var fields = new Array();
                       var values = new Array();
                       var place_holders= new Array();
                       for(var key in data) {
                           fields.push('"' + key + '"');
                           values.push(data[key]);
                           place_holders.push('?');
                       }
                       values.push('false');
                       var stmt = 'INSERT INTO ' + 
                       table_name + 
                       ' (' + fields.join(',') + ',"created_at", "updated_at", "dirty_flag")' +
                       ' VALUES(' + place_holders.join(',') + ", datetime('now'), datetime('now'), ?)";
            
                       tx.executeSql(stmt, values, success, error); 
                 }
                }, error); 
            })(id);

            // send create message along with DB data which has new_flag = true
            var stmt = 'SELECT * FROM ' + 
                       table_name + 
                       ' WHERE new_flag = ?'; 
            tx.executeSql(stmt, ['true'], 
              function(tx, res){
                 for(var i = 0; i < res.rows.length; i++) {
                   var data = ActiveSupport.Object.clone(res.rows.item(i));
                   delete data.delete_flag;
                   delete data.dirty_flag;
                   delete data.new_flag;
                   model.create(data, true);
                 }

                 // send update message along with DB data which has dirty_flag = true
                 var stmt = 'SELECT * FROM ' + 
                            table_name + 
                            ' WHERE dirty_flag = ?'; 
                 tx.executeSql(stmt, ['true'], 
                   function(tx, res){
                      for(var i = 0; i < res.rows.length; i++) {
                        var id = res.rows.item(i).id;
                        var data = ActiveSupport.Object.clone(res.rows.item(i));
                        delete data.delete_flag;
                        delete data.dirty_flag;
                        delete data.new_flag;
                        model.update(id, data, true);
                      }

                      // send delete message along with DB data which has delete_flag = true
                      var stmt = 'SELECT * FROM ' + 
                                table_name + 
                                ' WHERE delete_flag = ?'; 
                      tx.executeSql(stmt, ['true'], 
                        function(tx, res){
                           for(var i = 0; i < res.rows.length; i++) {
                             var id = res.rows.item(i).id;
                             model.destroy(id, true);
                           }
                        }, error); 
                   }, error); 
              }, error);
            if(typeof(callback) == 'function') callback();
        }, error);
    },

    destroy: function(table_name, id, success, error) {
        if(!this.db) {
            throw new Error('The database is not open');
        }
        if(!success) success = Churros.WebDB.successHandler;
        if(!error) error = Churros.WebDB.errorHandler;

        this.db.transaction(function(tx) {
            var stmt = 'DELETE FROM ' + 
                       table_name + 
                       ' WHERE id = ?'; 
            tx.executeSql(stmt, [id], success, error);
        });
    },

    setAsDeleted: function(table_name, id, success, error) {
        if(!this.db) {
            throw new Error('The database is not open');
        }
        if(!id) {
            throw new Error('id is not specified');
        }
        if(!success) success = Churros.WebDB.successHandler;
        if(!error) error = Churros.WebDB.errorHandler;

        this.db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM ' + table_name + ' WHERE id = ?', [id], 
                          function(tx, rs){
                              if(rs.rows.length > 0) {
                                  var stmt = 'UPDATE ' + 
                                             table_name + 
                                             ' SET "delete_flag" = "true"' +
                                             ' WHERE id = ?';
                                  tx.executeSql(stmt, [id], success, error); 
                              }else { // no record
                                  throw new Error('no such record to update. (id: ' + id + ')');
                              }
                          }, error);
        });
    },

    update: function(table_name, data, id, dirty_flag, success, error) {
        if(!this.db) {
            throw new Error('The database is not open');
        }
        if(!id) {
            throw new Error('id is not specified');
        }
        if(!success) success = Churros.WebDB.successHandler;
        if(!error) error = Churros.WebDB.errorHandler;

        var updates = new Array();
        var values = new Array();
        for(var key in data) {
            if(key != 'id' && key != 'updated_at' && key != 'created_at'){ 
                updates.push('"' + key + '" = ?');
                values.push(data[key]);
            }
        }
        values.push(dirty_flag);
        values.push(id);
        this.db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM ' + table_name + ' WHERE id = ?', [id], 
                          function(tx, rs){
                              if(rs.rows.length > 0) {
                                  var stmt = 'UPDATE ' + 
                                             table_name + 
                                             ' SET ' +
                                             updates.join(',') +
                                             ", updated_at = datetime('now'), dirty_flag = ?" +
                                             ' WHERE id = ?';
                                  tx.executeSql(stmt, values, success, error); 
                              }else { // no record
                                  throw new Error('no such record to update. (id: ' + id + ')');
                              }
                          }, error);
        });
    }
}
