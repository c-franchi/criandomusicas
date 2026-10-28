"""Render brand artwork for static Open Graph cards (no private gift data)."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math
ROOT=Path(__file__).resolve().parent.parent
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
S=2

def font(n,bold=False):return ImageFont.truetype(BOLD if bold else FONT,n*S)
def box(draw,xy,fill,r=20,outline=None,width=1):draw.rounded_rectangle(tuple(int(n*S) for n in xy),r*S,fill=fill,outline=outline,width=width*S)
def text(draw,xy,value,n=20,color='#f8f5ff',bold=False):draw.text((xy[0]*S,xy[1]*S),value,font=font(n,bold),fill=color)
def line(draw,points,color,width=2):draw.line([(int(x*S),int(y*S)) for x,y in points],fill=color,width=width*S)
for kind,title,subtitle,label in [
 ('digital',['Um presente feito','para emocionar.'],'Sua música. Sua história. Seu carinho.','CARTÃO MUSICAL DIGITAL'),
 ('short',['Uma pequena canção.','Uma grande surpresa.'],'Dê o play em uma lembrança especial.','MÚSICA CURTA PERSONALIZADA'),
 ('physical',['Um cartão para guardar.','Uma música para sentir.'],'O presente continua quando a música começa.','CARTÃO MUSICAL PARA IMPRIMIR')]:
 im=Image.new('RGB',(1200*S,630*S));px=im.load()
 for y in range(630*S):
  for x in range(1200*S):
   glow=max(0,1-math.hypot((x/S-960)/900,(y/S-200)/700))
   px[x,y]=(int(12+27*glow),int(9+8*glow),int(23+48*glow))
 d=ImageDraw.Draw(im)
 box(d,(52,45,105,98),'#8b41ef',15)
 text(d,(66,49),'♪',33,bold=True)
 text(d,(121,58),'Criando Músicas',24,bold=True)
 text(d,(58,188),label,14,'#d0afff',True)
 for i,t in enumerate(title):text(d,(55,232+i*65),t,36 if kind=='physical' else 40,bold=True)
 text(d,(58,394),subtitle,18,'#d5cee6')
 box(d,(58,472,375,528),'#8b41ef',28)
 text(d,(84,486),'Abra sua surpresa musical',18,bold=True)
 text(d,(58,575),'criandomusicas.com.br',16,'#c6b8d9')
 if kind=='digital':
  box(d,(820,92,1100,546),'#100f22',36,'#a997cd',3)
  box(d,(908,108,1011,117),'#605173',5)
  text(d,(925,178),'♡',62,'#f0adf1')
  text(d,(857,293),'Para alguém',23,bold=True)
  text(d,(878,328),'especial',23,bold=True)
  box(d,(925,397,998,470),'#b373f2',36)
  d.polygon([(951*S,419*S),(951*S,448*S),(975*S,433*S)],fill='white')
 elif kind=='short':
  box(d,(788,146,1145,495),'#181329',32,'#6c468e',2)
  text(d,(864,178),'DÊ O PLAY',18,'#dfb9ff',True)
  for i,h in enumerate([30,60,96,54,124,72,110,44,86,36]):box(d,(823+i*29,330-h/2,836+i*29,330+h/2),'#c380ef',6)
  text(d,(856,433),'Feita para você',22,bold=True)
 else:
  box(d,(783,130,1138,480),'#ede3f5',12)
  line(d,[(960,145),(960,464)],'#c3a9d2',1)
  text(d,(801,202),'Uma música',17,'#4d246d',True)
  text(d,(806,230),'para sentir.',17,'#4d246d',True)
  text(d,(827,282),'♡',50,'#8c46ab')
  # Play symbol instead of decorative QR; actual print QR is generated in the product.
  box(d,(1004,250,1096,342),'#723ba2',46)
  d.polygon([(1037*S,274*S),(1037*S,317*S),(1072*S,296*S)],fill='white')
  text(d,(815,422),'Abra o presente musical',17,'#4d246d')
 im.resize((1200,630),Image.Resampling.LANCZOS).save(ROOT/'public'/'social'/f'gift-{kind}-v2.png',optimize=True)
 print(kind)
