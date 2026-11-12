# 필수 데이터 (2026-11-10, 설계안 v3)

설계안 v3의 시뮬레이션이 실제로 읽는 자료만 남기고 중복을 제거해 **3개 파일**로 합친 것입니다.
다른 컴퓨터로 옮길 때는 이 폴더의 3개 파일만 복사하면 됩니다.
이 폴더의 근거 자료와 더 큰 원본은 `LocisCode\원천데이터_20261110\`(135.7MB)에 그대로 있습니다. 이 폴더를 만들면서 그쪽은 지우거나 바꾸지 않았습니다.

| 파일 | 크기 | 내용 |
|---|---|---|
| `필수데이터_표.xlsx` | 1.5MB | 시트 7개: `info`(시트 안내), `port_month`, `ports`, `species`, `yearbook_74spp`, `yearbook_all_taxa`, `port_species_100km` |
| `S_lqh_종_항만_월.zip` | 5.8MB | 안의 `S_lqh.csv` 한 개: 종 × 항만 × 월 서식 적합도 510,400행 |
| `README_필수데이터.md` | | 이 문서 |

## 1. 읽는 법

```python
import pandas as pd, zipfile
rd = lambda s: pd.read_excel('필수데이터_표.xlsx', sheet_name=s, keep_default_na=False, na_values=[''])
port_month, ports, species = rd('port_month'), rd('ports'), rd('species')
with zipfile.ZipFile('S_lqh_종_항만_월.zip') as z:
    S = pd.read_csv(z.open('S_lqh.csv'), keep_default_na=False, na_values=[''])
```

**`keep_default_na=False`는 필수입니다.** 나미비아의 국가 코드 `NA`가 결측으로 읽히는 것을 막습니다.

## 2. 시트와 열

**`port_month`** (6,517행): 항만 × 연월 패널
- `port_id, country, year, month`
- `empty_teu`: 공컨 물동량(TEU)
- `volume_source`: `measured`(2016.01~2021.08 실측), `estimated`(2021.09~ 추정), `none`(2021.09 이후 값 없음), `n/a`(기후 전용 행)
- `row_source`: `master`(원 마스터 CSV의 6,499행), `era5_extra`(마스터에 없고 추가 추출로 얻은 **기후 전용 18행**, 물동량 없음)
- 기후 9변수 `x_dew_c`(이슬점), `x_rh_pct`(상대습도), `x_soiltemp_c`(표층 토양온도), `x_soilmoist_m3m3`(표층 토양수분), `x_solar_wm2`(일사량), `x_rain_mm`(강수량), `x_tmin_c`·`x_tmax_c`·`x_tmean_c`(일최저·일최고·평균기온)

**`ports`** (185행): 항만 이름, 국가, 위경도, `is_domestic`. 해외 175 + 국내 10(인천항 `KRINC` 포함, 이 행의 기후가 유사도 계산의 기준)

**`species`** (110행): 후보 110종
- 분류(`목(한글)`, `과(영문)`, `gbif_order`, `gbif_family`)
- IPBES: 원점수 `IPBES_E_raw`·`IPBES_C_raw`, 대치 출처 `ipbes_src`, 사용값 `E_used`·`C_used`, `EC_norm`
- AUC: `auc_test_lqh` 등
- 플래그: `in_model88`(MaxNet 학습 성공 88종), `is_spider`(거미목 14종), `in_analysis74`(분석 대상 74종)
- 위험도: `w_s_auc_x_EC = auc_test_lqh × sqrt(E_used² + C_used²)`
- 연보: `yearbook_total_2016_2025`, `yearbook_years_detected`, `yearbook_countries`
- **β와 학습 범위**: `beta_<변수>`, `trainmin_<변수>`, `trainmax_<변수>` (모델 88종만 값이 있음, 학습 범위 = max − min)

**`yearbook_74spp`** (187행): 분석 74종 × 수출국(`iso2`) × 연도 발견 횟수(`n`). 22종만 기록이 있고 합계 420건. 옛 학명은 현재 학명으로 합쳤음

**`yearbook_all_taxa`** (15,810행): 연보의 모든 분류군 × 수출국 × 연도(합계 102,568건). `order·family·phylum`은 GBIF 속명 조회로 붙인 값이며 **행의 77.3%에만 있습니다**(동물로 매칭된 행). 병원체·선충·잡초 오탐이 섞여 있음

**`port_species_100km`** (1,303행): 해외 175항만 반경 100 km 안 종별 GBIF 출현 기록 수. 0건 쌍은 생략

**`S_lqh.csv`** (510,400행): `speciesKey, port_id, year, month, S_cloglog_lqh`. 모델 88종 × 항만월 5,800개, 결측 0. `year, month`는 사용한 기후 월이고 **계획 월은 (year+1, month)** 입니다(원본의 `evaluation_year`, `evaluation_month` 열은 이 규칙으로 계산되므로 뺐고, 전체 행에서 규칙이 성립함을 확인했습니다).

## 3. 무엇을 뺐나

| 뺀 것 | 이유 | 확인 방법 |
|---|---|---|
| `05_해외항만_MaxNet예측용_5800행.csv` | 마스터의 해외 5,782행과 값이 같음. **마스터에 없는 18행만** `port_month`에 합침 | 키 일치 5,782행, 값 차이 없음 |
| 물동량 tidy·wide·국가별 합계 표, 마스터 CSV의 빈 열 `S1~S231` | 마스터에서 계산할 수 있음 / v1 잔재 | |
| 물동량 원본 엑셀 5종 | 마스터와 값이 일치(실측 1,868행 전부, 추정 국가·월 합계 463개 전부) | 대조 표 `원천데이터_20261110\01_...\consistency_check_*.csv` |
| `auc_progress.csv` | `auc_summary_all_species.csv`와 완전히 같음 | 전체 비교 |
| `minmax_train_only.csv` | 계수 파일의 학습 범위와 같음(차이 약 1e-12). 계수 파일에는 88번째 종도 있음 | 783행 비교 |
| 제외·보류 종 표, 학습 가능 심사 로그, `config_qa.json`, 팀원 R 코드와 문서 | 제외 사유는 `species.excluded_stage`에 흡수. 나머지는 재학습에만 필요 | |
| `환경부_*_88종.csv` 등 퍼널 CSV, 구형 항만별 건수 2개 | **모델 88종과 다른 이전 단계 목록** / 구형(v1) 자료 | 종 집합 비교 |
| GBIF 출현점 238,238행 (12MB) | 항만 100 km 표가 대신함. 반경을 바꿔 다시 세려면 원천 패키지가 필요 | |
| 연보 PDF 10개(64MB)와 추출 중간표 | 추출 결과(`yearbook_*`)만 유지 | |
| IPBES DB 원자료 28MB, `외래생물종정보.xlsx` | `species`에 필요한 점수·분류가 들어 있음 | |
| 설계안·인계 문서·원논문 | `LocisCode\` 원본에 있음 | |

## 4. 검증 결과

1. **이 3개 파일만으로 기존 실험의 입력을 그대로 재현합니다.** 평가월 2025-01, 2025-08, 2026-01, 2026-08에서 항만 목록, 물동량 N, 정규화 기후, 가중 유사도 W, 서식 적합도 S를 원본 경로(마스터 CSV, 05 파일, 계수 파일, S 파일)로 만든 결과와 비교했습니다. 항만 목록이 같고 모든 배열의 최대 차이가 **8e-16 이하**입니다. 마스터에 없는 18행은 2025-01·2025-08 평가에 쓰이므로 이 비교에 포함됩니다.
2. **평가월별 항만 수 G**가 설계안과 같습니다: 2025-01 = 28, 2025-08 = 30, 2026-01 = 24, 2026-08 = 36. (위 읽는 법 코드 뒤에 아래를 붙여 확인)
   ```python
   for y, m in ((2026, 1), (2026, 8)):
       cur = port_month[(port_month.year==y)&(port_month.month==m)&(port_month.country!='KR')&(port_month.empty_teu>=1)].port_id
       prev = set(port_month[(port_month.year==y-1)&(port_month.month==m)].port_id)
       okS = set(S[(S.year==y-1)&(S.month==m)].port_id)
       print(y, m, len(set(cur) & prev & okS))   # 기대값: 24, 36
   ```
3. **SHA-256**
   ```
   fa5d014fe3c4363976fa2b4fa6ad01ad5fb3007339b64f3dc4a8f18fe671f9e1  필수데이터_표.xlsx
   fb4dec74af3de7b69cdd40fca4c61b60b1031f39404e2fa2d978686e73b3f31c  S_lqh_종_항만_월.zip
   ```
   (PowerShell: `Get-FileHash 파일명 -Algorithm SHA256`)

## 5. 반드시 알아야 할 주의사항

1. **2021.09 이후 물동량은 추정값입니다.** 국가 합계를 항만에 나눈 값이고, 반올림 전 소수입니다. 분배 엑셀의 설명 시트에 "2021.09~2026 '공' 값이 수입 공컨만인지 확인되지 않음 (2019~2021 인천 수입 공컨보다 수준이 큼)"이라는 경고가 있습니다. 이 값을 고객이 가진 실제 값으로 가정합니다.
2. **추정 구간에서는 국가 안 항만 비중이 거의 고정입니다**(변동계수 중앙값 2021.09 이전 0.61, 이후 0.09). 물동량 예측 오차의 크기는 실측 구간(2016.01~2021.08)에서만 재야 합니다.
3. **S의 상당 부분이 외삽입니다.** 종별 학습 범위를 벗어난 기후가 들어간 셀이 전체의 22.4%, 평가월 2026-08은 43.7%(2025-08은 54.4%)입니다. 이 값은 `trainmin_*`·`trainmax_*`와 `port_month`의 기후로 직접 계산한 것이며 팀원의 범위 이탈 요약 파일과는 별개입니다.
4. **`port_species_100km`**: 반경 100 km는 구형(v1) 76항만 설계의 값이고 현재 175항만 퍼널의 반경은 모릅니다. 원 GBIF 건수가 아니라 학습용으로 솎아낸 기록입니다.
5. **연보 자료**: 식물·목재 화물의 전국 적발 기록이며 공컨테이너·인천항 전용이 아닙니다. 출발 국가 단위입니다. 거미목 14종은 10년간 한 건도 없어 분석에서 제외했습니다(`is_spider`).
6. **기후 누락**: 추가 추출 29건 중 11개 항만은 기후가 없습니다(CNHUH, CNJTG, CNZUH, THSRI, CNTNG, AEJEA). 평가에 영향이 있는 것은 CNJTG뿐입니다(2025-08 물동량의 0.2%, 인계 문서 내용).
7. **받지 못한 MaxNet 파일**: `models_*`(모델 .rds), `port_out_of_range_summary.csv`, `run_info.txt`. 현재 분석에는 필요하지 않습니다.

## 6. 다시 만들 때

`LocisCode\원천데이터_20261110\코드\build_essential_package.py`가 원천 패키지에서 이 3개 파일을 만듭니다(원래 컴퓨터의 경로가 박혀 있음). 다시 만들면 xlsx와 zip의 해시가 달라집니다(파일에 생성 시각이 들어감). 이 README의 해시는 지금 파일 기준입니다.
