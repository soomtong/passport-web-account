## couch db function list

```
"recent_list": {
           "map": "function (doc) {\n    if (doc.trash != true) {\n      var d = new Date(doc.updated_at);\n      var keys = [ d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() ];\n\n      emit(keys, doc);\n    }\n  }"
       }
```

```
"total_list": {
           "map": "function (doc) {\n    emit(doc._id, doc.title)\n    }"
       }
```

```
"note_list": {
       "map": "function (doc) {\n    if (doc.type == 'note') {\n      emit(doc._id, doc.title)\n      }\n    }"
   }
```
