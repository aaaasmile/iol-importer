 
 Ho riempito il db di sqlite 3 con:
 node app.js
 Il file app.js è commentato a sufficienza per capire come funziona l'import. I files html sono già scaricati,
 anche perché sul sito non sono più disponibili. Vengono importati 20803 post ditribuiti su due forum che vanno importati
 separatamente (1-503 e 1-31 pagine), che è durato più di un'ora.
 Il db l'ho preparato con sqlite3 a linea di comando usando sql direttamente lasciandomi ispirare dallo script sql 
 che avevo creato per mysql:
CREATE TABLE iol_source(id primary key, name);
CREATE TABLE iol_post (id INTEGER primary key AUTOINCREMENT, post_id, post_parent_id, post_content, date_published , user_name, forum_source);
Nota sui campi. id è un alias di rowid, che rimane. id è integer, mentre tutti gli altri sono campi di testo. date_published ho fatto in modo che
la stringa salvata nel campo di la data in formato ISO, perché è facile da decifrare. Se uso la struttura javascript Date, il campo viene
salvato come un numero e non si capisce il giorno.

Uso la command line sqlite3 che è in ../sqlite.
Per farlo partire si usa:
sqlite3 iolvienna.db
.schema per vedere i cambiamenti. Dal sito https://crawshaw.io/blog/one-process-programming-notes
ho preso l'ispirazione per usa sql3. 

Per prima cosa, dopo aver importato i dati, ho creato la tabella playsearch per avere il comando MATCH: 
CREATE VIRTUAL TABLE playsearch USING fts5(playsrowid, text);
Ora importo il contenuto iol_post in playsearch:
INSERT INTO playsearch select rowid, post_content from iol_post;
Qui posso usare una ricerca come:
select rowid,text from playsearch where text MATCH "oca"

Poi eseguo la query con i campi di iol_post
select user_name, date_published from playsearch inner join iol_post ON playsearch.playsrowid = iol_post.rowid where playsearch.text MATCH "oca";

Per verder chi ha scritto più post (primi 20), si usa:
select count(id) as thecount, user_name from iol_post group by user_name ORDER BY thecount DESC LIMIT 20;